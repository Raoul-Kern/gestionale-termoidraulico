-- Chiusura del rapportino: una sola transazione, idempotente sul record e
-- protetta dal sorpasso di una bozza vecchia.

insert into storage.buckets (id, name, public)
values ('firme', 'firme', false)
on conflict (id) do nothing;

drop policy if exists firme_lettura on storage.objects;
drop policy if exists firme_scrittura on storage.objects;

create policy firme_lettura on storage.objects for select
  using (bucket_id = 'firme' and auth.uid() is not null);
create policy firme_scrittura on storage.objects for insert
  with check (bucket_id = 'firme' and auth.uid() is not null);

-- security definer, non invoker: la funzione legge utenti.tariffa_costo_oraria,
-- colonna revocata a tecnici e ufficio. Per questo verifica da sé chi sta
-- chiudendo invece di affidarsi alle policy.
create or replace function chiudi_rapportino(
  p_intervento_id uuid,
  p_note text default null,
  p_firmatario text default null,
  p_firma_url text default null,
  p_ore jsonb default '[]'::jsonb,
  p_materiali jsonb default '[]'::jsonb,
  p_bozza_aggiornata_il timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapportino_id uuid;
  v_aggiornato_il timestamptz;
  v_tecnico_assegnato uuid;
  v_ruolo ruolo_utente;
  v_tariffe impostazioni;
  v_costo numeric(10,2);
begin
  v_ruolo := ruolo_corrente();

  select tecnico_id into v_tecnico_assegnato from interventi where id = p_intervento_id;
  if not found then
    raise exception 'Intervento inesistente' using errcode = '42704';
  end if;

  if v_tecnico_assegnato is distinct from auth.uid()
     and coalesce(v_ruolo::text, '') not in ('ufficio', 'titolare') then
    raise exception 'Intervento di un altro tecnico' using errcode = '42501';
  end if;

  -- Il vincolo unique protegge dal doppione, non dal sorpasso: una bozza
  -- rimasta in coda per giorni non deve sovrascrivere le correzioni
  -- dell'ufficio.
  select id, aggiornato_il into v_rapportino_id, v_aggiornato_il
  from rapportini where intervento_id = p_intervento_id;

  if v_rapportino_id is not null
     and p_bozza_aggiornata_il is not null
     and v_aggiornato_il > p_bozza_aggiornata_il then
    -- 55006 (object_in_use), non 40001: PostgREST considera il serialization
    -- failure un errore transitorio e ripete la chiamata da solo, così il
    -- rifiuto non arriverebbe mai al chiamante.
    raise exception 'Rapportino già modificato in ufficio il %', v_aggiornato_il
      using errcode = '55006';
  end if;

  select * into v_tariffe from impostazioni where id;
  select tariffa_costo_oraria into v_costo from utenti where id = auth.uid();
  v_costo := coalesce(v_costo, 0);

  insert into rapportini (intervento_id, tecnico_id, note, firmatario, firma_url)
  values (
    p_intervento_id,
    coalesce(v_tecnico_assegnato, auth.uid()),
    p_note,
    nullif(p_firmatario, ''),
    nullif(p_firma_url, '')
  )
  on conflict (intervento_id) do update
    set note = excluded.note,
        firmatario = excluded.firmatario,
        firma_url = coalesce(excluded.firma_url, rapportini.firma_url),
        chiuso_il = now()
  returning id into v_rapportino_id;

  delete from rapportino_ore where rapportino_id = v_rapportino_id;
  delete from rapportino_materiali where rapportino_id = v_rapportino_id;

  -- Prezzi presi dal database, non dalla bozza: un telefono con listino vecchio
  -- in cache non deve produrre importi sbagliati.
  insert into rapportino_ore (rapportino_id, tipo, minuti, prezzo_orario, costo_orario)
  select
    v_rapportino_id,
    (riga ->> 'tipo')::tipo_ora,
    (riga ->> 'minuti')::integer,
    case (riga ->> 'tipo')::tipo_ora
      when 'viaggio' then v_tariffe.prezzo_ora_viaggio
      when 'ordinario' then v_tariffe.prezzo_ora_ordinaria
      when 'urgenza' then v_tariffe.prezzo_ora_urgenza
    end,
    v_costo
  from jsonb_array_elements(coalesce(p_ore, '[]'::jsonb)) as riga
  where (riga ->> 'minuti')::integer > 0;

  insert into rapportino_materiali (
    rapportino_id, materiale_id, descrizione, quantita, prezzo_vendita, prezzo_acquisto
  )
  select
    v_rapportino_id,
    m.id,
    coalesce(m.descrizione, riga ->> 'descrizione'),
    (riga ->> 'quantita')::numeric,
    coalesce(m.prezzo_vendita, (riga ->> 'prezzo_vendita')::numeric),
    coalesce(m.prezzo_acquisto, 0)
  from jsonb_array_elements(coalesce(p_materiali, '[]'::jsonb)) as riga
  left join materiali m on m.id = nullif(riga ->> 'materiale_id', '')::uuid
  where (riga ->> 'quantita')::numeric > 0;

  update interventi set stato = 'chiuso' where id = p_intervento_id;

  return v_rapportino_id;
end;
$$;

revoke all on function chiudi_rapportino(uuid, text, text, text, jsonb, jsonb, timestamptz)
  from public;
grant execute on function chiudi_rapportino(uuid, text, text, text, jsonb, jsonb, timestamptz)
  to authenticated;
