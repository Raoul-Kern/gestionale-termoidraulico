-- Permessi: le policy RLS decidono quali righe, i privilegi quali colonne.
--
-- Il ruolo applicativo (tecnico, ufficio, titolare) è un valore di colonna, non
-- un ruolo Postgres: chiunque sia autenticato arriva al database come
-- "authenticated". Da qui discendono le due metà di questo file.

create or replace function ruolo_corrente()
returns ruolo_utente
language sql
stable
security definer
set search_path = public
as $$
  select ruolo from utenti where id = auth.uid();
$$;

alter table utenti enable row level security;
alter table clienti enable row level security;
alter table sedi enable row level security;
alter table impianti enable row level security;
alter table materiali enable row level security;
alter table interventi enable row level security;
alter table rapportini enable row level security;
alter table rapportino_ore enable row level security;
alter table rapportino_materiali enable row level security;
alter table impostazioni enable row level security;

-- Utenti: ognuno legge se stesso, ufficio e titolare leggono tutti.
create policy utenti_lettura on utenti for select
  using (id = auth.uid() or ruolo_corrente() in ('ufficio', 'titolare'));
create policy utenti_scrittura on utenti for update
  using (ruolo_corrente() = 'titolare')
  with check (ruolo_corrente() = 'titolare');

-- Anagrafiche: lettura a tutti gli autenticati, modifica a ufficio e titolare.
-- L'inserimento di un cliente è concesso anche al tecnico: serve per il lavoro
-- non programmato, quando è sul posto da qualcuno che non è in anagrafica.
create policy clienti_lettura on clienti for select using (auth.uid() is not null);
create policy clienti_inserimento on clienti for insert with check (auth.uid() is not null);
create policy clienti_modifica on clienti for update
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy sedi_lettura on sedi for select using (auth.uid() is not null);
create policy sedi_inserimento on sedi for insert with check (auth.uid() is not null);
create policy sedi_modifica on sedi for update
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy impianti_lettura on impianti for select using (auth.uid() is not null);
create policy impianti_scrittura on impianti for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy materiali_lettura on materiali for select using (auth.uid() is not null);
create policy materiali_scrittura on materiali for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy impostazioni_lettura on impostazioni for select using (auth.uid() is not null);
create policy impostazioni_scrittura on impostazioni for update
  using (ruolo_corrente() = 'titolare')
  with check (ruolo_corrente() = 'titolare');

-- Interventi: il tecnico vede e aggiorna solo i propri.
create policy interventi_lettura on interventi for select
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());
create policy interventi_scrittura_ufficio on interventi for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));
create policy interventi_stato_tecnico on interventi for update
  using (tecnico_id = auth.uid())
  with check (tecnico_id = auth.uid());
create policy interventi_inserimento_tecnico on interventi for insert
  with check (tecnico_id = auth.uid());

-- Rapportini: il tecnico scrive i propri, l'ufficio li gestisce tutti.
create policy rapportini_lettura on rapportini for select
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());
create policy rapportini_inserimento on rapportini for insert
  with check (tecnico_id = auth.uid() or ruolo_corrente() in ('ufficio', 'titolare'));
create policy rapportini_modifica on rapportini for update
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid())
  with check (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());

-- Righe: seguono il rapportino padre.
create policy ore_lettura on rapportino_ore for select
  using (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ));
create policy ore_scrittura on rapportino_ore for all
  using (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ))
  with check (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ));

create policy materiali_righe_lettura on rapportino_materiali for select
  using (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ));
create policy materiali_righe_scrittura on rapportino_materiali for all
  using (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ))
  with check (exists (
    select 1 from rapportini r where r.id = rapportino_id
      and (ruolo_corrente() in ('ufficio', 'titolare') or r.tecnico_id = auth.uid())
  ));

-- Seconda metà: le colonne di costo.
--
-- Le policy filtrano righe, non colonne, quindi qui servono i privilegi. E vanno
-- usati nel modo giusto: un "revoke select (colonna)" non toglie niente a un
-- ruolo che ha select sull'intera tabella, ed è esattamente ciò che Supabase
-- concede ad anon e authenticated. Si revoca la tabella e si riconcede colonna
-- per colonna.
revoke select on utenti, materiali, rapportino_ore, rapportino_materiali
  from anon, authenticated;

grant select (id, nome, ruolo, colore, attivo, creato_il, aggiornato_il)
  on utenti to authenticated;
grant select (id, codice, descrizione, unita, prezzo_vendita, attivo, creato_il, aggiornato_il)
  on materiali to authenticated;
grant select (id, rapportino_id, tipo, minuti, prezzo_orario, creato_il)
  on rapportino_ore to authenticated;
grant select (id, rapportino_id, materiale_id, descrizione, quantita, prezzo_vendita, creato_il)
  on rapportino_materiali to authenticated;

grant insert, update, delete on rapportino_ore, rapportino_materiali to authenticated;
grant insert, update on rapportini to authenticated;
grant update on utenti to authenticated;
grant insert, update on materiali to authenticated;

-- La revoca vale anche per il titolare, che è comunque "authenticated". Ogni
-- lettura di costi passa quindi da una funzione security definer che controlla
-- il ruolo applicativo, e nessuna query dell'applicazione chiede mai una colonna
-- di costo direttamente.
create view interventi_con_margine
with (security_invoker = false)
as
select
  i.id as intervento_id,
  i.data,
  s.cliente_id,
  i.tecnico_id,
  r.id as rapportino_id,
  r.stato_fatturazione,
  coalesce(o.ricavo_ore, 0) as ricavo_ore,
  coalesce(o.costo_ore, 0) as costo_ore,
  coalesce(m.ricavo_materiali, 0) as ricavo_materiali,
  coalesce(m.costo_materiali, 0) as costo_materiali,
  coalesce(o.ricavo_ore, 0) + coalesce(m.ricavo_materiali, 0) as totale_intervento,
  coalesce(o.ricavo_ore, 0) + coalesce(m.ricavo_materiali, 0)
    - coalesce(o.costo_ore, 0) - coalesce(m.costo_materiali, 0) as margine,
  -- Un costo orario a zero significa che manca la tariffa del tecnico in
  -- anagrafica, non che il lavoro è stato gratis: va segnalato, non sommato.
  coalesce(o.costo_mancante, true) as margine_incompleto
from interventi i
join sedi s on s.id = i.sede_id
join rapportini r on r.intervento_id = i.id
left join (
  select rapportino_id,
    sum(minuti / 60.0 * prezzo_orario) as ricavo_ore,
    sum(minuti / 60.0 * costo_orario) as costo_ore,
    bool_or(costo_orario = 0) as costo_mancante
  from rapportino_ore group by rapportino_id
) o on o.rapportino_id = r.id
left join (
  select rapportino_id,
    sum(quantita * prezzo_vendita) as ricavo_materiali,
    sum(quantita * prezzo_acquisto) as costo_materiali
  from rapportino_materiali group by rapportino_id
) m on m.rapportino_id = r.id;

revoke all on interventi_con_margine from anon, authenticated;

create or replace function margini(dal date, al date)
returns setof interventi_con_margine
language sql
stable
security definer
set search_path = public
as $$
  select * from interventi_con_margine
  where ruolo_corrente() = 'titolare' and data between dal and al;
$$;

create or replace function listino_con_costi()
returns table (
  id uuid,
  codice text,
  descrizione text,
  unita text,
  prezzo_acquisto numeric(10,2),
  prezzo_vendita numeric(10,2),
  ricarico_percentuale numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.codice, m.descrizione, m.unita, m.prezzo_acquisto, m.prezzo_vendita,
    case when m.prezzo_acquisto = 0 then null
      else round((m.prezzo_vendita - m.prezzo_acquisto) / m.prezzo_acquisto * 100, 1)
    end
  from materiali m
  where ruolo_corrente() = 'titolare' and m.attivo
  order by m.codice;
$$;

revoke all on function margini(date, date) from public;
revoke all on function listino_con_costi() from public;
grant execute on function margini(date, date) to authenticated;
grant execute on function listino_con_costi() to authenticated;
