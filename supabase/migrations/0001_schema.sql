-- Schema del gestionale termoidraulico.
-- Tabelle, colonne e valori degli enum in italiano: è il vocabolario con cui
-- l'azienda parla del proprio lavoro, e resta leggibile anche nel database.

create type ruolo_utente as enum ('tecnico', 'ufficio', 'titolare');
create type tipo_impianto as enum ('caldaia', 'condizionatore', 'pompa_calore', 'altro');
create type priorita_intervento as enum ('bassa', 'normale', 'urgente');
create type stato_intervento as enum ('programmato', 'in_corso', 'chiuso', 'annullato');
create type tipo_ora as enum ('viaggio', 'ordinario', 'urgenza');
create type stato_fatturazione as enum ('da_fatturare', 'fatturato', 'non_fatturabile');

create or replace function tocca_aggiornato_il()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

create table utenti (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  ruolo ruolo_utente not null default 'tecnico',
  tariffa_costo_oraria numeric(10,2) not null default 0
    check (tariffa_costo_oraria >= 0),
  colore text not null default '#27705c',
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table clienti (
  id uuid primary key default gen_random_uuid(),
  ragione_sociale text not null,
  partita_iva text,
  codice_fiscale text,
  telefono text,
  email text,
  note text,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table sedi (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti (id) on delete cascade,
  etichetta text not null default 'Sede principale',
  indirizzo text not null,
  comune text,
  cap text,
  note_accesso text,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table impianti (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedi (id) on delete cascade,
  tipo tipo_impianto not null,
  marca text,
  modello text,
  matricola text,
  ultima_manutenzione date,
  intervallo_mesi integer not null default 12 check (intervallo_mesi > 0),
  -- Calcolata dal database: il badge dello scadenzario è una query ordinata,
  -- non logica ripetuta in ogni schermata.
  prossima_manutenzione date generated always as (
    (ultima_manutenzione + make_interval(months => intervallo_mesi))::date
  ) stored,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  -- Bersaglio della chiave esterna composta di interventi: lega l'impianto alla
  -- sua sede, così un intervento non può puntare all'impianto di un'altra.
  unique (sede_id, id)
);

create table materiali (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  descrizione text not null,
  unita text not null default 'pz',
  prezzo_acquisto numeric(10,2) not null default 0 check (prezzo_acquisto >= 0),
  prezzo_vendita numeric(10,2) not null default 0 check (prezzo_vendita >= 0),
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

-- Nessun cliente_id: il cliente si ricava dalla sede. Tenere entrambi i
-- riferimenti permetterebbe di associare la sede di un cliente a un altro.
create table interventi (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedi (id) on delete restrict,
  impianto_id uuid,
  tecnico_id uuid references utenti (id) on delete set null,
  data date not null,
  ora_inizio time,
  durata_prevista_minuti integer not null default 60 check (durata_prevista_minuti > 0),
  descrizione text not null,
  priorita priorita_intervento not null default 'normale',
  stato stato_intervento not null default 'programmato',
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  -- L'impianto deve appartenere alla sede dell'intervento. Con impianto_id nullo
  -- il vincolo non si applica. Gli impianti si dismettono con attivo = false,
  -- non si cancellano: da qui il restrict.
  constraint interventi_impianto_della_sede
    foreign key (sede_id, impianto_id) references impianti (sede_id, id)
    on delete restrict
);

create table rapportini (
  id uuid primary key default gen_random_uuid(),
  intervento_id uuid not null unique references interventi (id) on delete cascade,
  tecnico_id uuid not null references utenti (id) on delete restrict,
  note text,
  firma_url text,
  firmatario text,
  chiuso_il timestamptz not null default now(),
  stato_fatturazione stato_fatturazione not null default 'da_fatturare',
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

-- Le righe congelano prezzo e costo al momento della chiusura: un aumento di
-- listino non deve riscrivere il valore di un lavoro già eseguito.
create table rapportino_ore (
  id uuid primary key default gen_random_uuid(),
  rapportino_id uuid not null references rapportini (id) on delete cascade,
  tipo tipo_ora not null,
  minuti integer not null check (minuti > 0),
  prezzo_orario numeric(10,2) not null check (prezzo_orario >= 0),
  costo_orario numeric(10,2) not null default 0 check (costo_orario >= 0),
  creato_il timestamptz not null default now()
);

create table rapportino_materiali (
  id uuid primary key default gen_random_uuid(),
  rapportino_id uuid not null references rapportini (id) on delete cascade,
  materiale_id uuid references materiali (id) on delete set null,
  descrizione text not null,
  quantita numeric(10,3) not null check (quantita > 0),
  prezzo_vendita numeric(10,2) not null check (prezzo_vendita >= 0),
  prezzo_acquisto numeric(10,2) not null default 0 check (prezzo_acquisto >= 0),
  creato_il timestamptz not null default now()
);

create table impostazioni (
  id boolean primary key default true check (id),
  prezzo_ora_ordinaria numeric(10,2) not null default 40 check (prezzo_ora_ordinaria >= 0),
  prezzo_ora_viaggio numeric(10,2) not null default 30 check (prezzo_ora_viaggio >= 0),
  prezzo_ora_urgenza numeric(10,2) not null default 60 check (prezzo_ora_urgenza >= 0),
  aggiornato_il timestamptz not null default now()
);

insert into impostazioni (id) values (true);

-- Indici sulle query che l'applicazione fa davvero
create index interventi_data_tecnico_idx on interventi (data, tecnico_id);
create index interventi_stato_idx on interventi (stato);
create index rapportini_stato_idx on rapportini (stato_fatturazione, chiuso_il desc);
create index impianti_scadenza_idx on impianti (prossima_manutenzione) where attivo;
create index sedi_cliente_idx on sedi (cliente_id);
create index materiali_ricerca_idx on materiali
  using gin (to_tsvector('italian', codice || ' ' || descrizione));

do $$
declare t text;
begin
  foreach t in array array[
    'utenti','clienti','sedi','impianti','materiali','interventi','rapportini'
  ]
  loop
    execute format(
      'create trigger %1$s_aggiornato_il before update on %1$s
       for each row execute function tocca_aggiornato_il()', t
    );
  end loop;
end $$;
