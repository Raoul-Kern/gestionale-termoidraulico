# Gestionale termoidraulico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire l'MVP di un gestionale per un'azienda termoidraulica: rapportino mobile offline-capace per i tecnici, planning giornaliero per l'ufficio, calcolo totali con export per il commercialista, scadenzario manutenzioni e dashboard margini per il titolare.

**Architecture:** Un solo progetto Next.js (App Router) su Supabase. Le liste sono Server Components che leggono via client server-side; solo timer, firma, ricerca materiali e drag sono client components. L'autorizzazione vive nelle policy RLS di Postgres, non nel frontend. Le righe dei rapportini congelano prezzi e costi al momento dell'uso.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui, Supabase (Postgres + Auth + Storage + Realtime), `@supabase/ssr`, `@dnd-kit/core`, `idb-keyval`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-gestionale-termoidraulica-design.md`

## Global Constraints

- Nomi di tabelle, colonne, tipi enum e valori enum in italiano. Nessun `created_at`: `creato_il`, `aggiornato_il`.
- Importi `numeric(10,2)`, quantità `numeric(10,3)`. Arrotondamento a due decimali solo in presentazione.
- Le righe `rapportino_ore` e `rapportino_materiali` copiano prezzo di vendita e costo. `materiale_id` non è la fonte del prezzo.
- Ogni colonna di prezzo e di costo ha `check (valore >= 0)`: lo zero è ammesso, il negativo no.
- Le colonne di costo (`tariffa_costo_oraria`, `prezzo_acquisto`, `costo_orario`) sono leggibili solo dal ruolo `titolare`. Il meccanismo è `revoke select` sulla tabella più `grant select (colonne ammesse)`: un `revoke` di sola colonna non toglie nulla a un ruolo che ha `select` sull'intera tabella, ed è ciò che Supabase concede a `authenticated`.
- `interventi` non ha `cliente_id`: il cliente si ricava da `sede_id`. `impianto_id` è vincolato alla stessa sede da una chiave esterna composta.
- `prossima_manutenzione` è una colonna generata dal database, mai calcolata nell'applicazione.
- `rapportini.intervento_id` è UNIQUE: la chiusura del rapportino deve essere idempotente.
- Ogni task finisce con un commit. Messaggi di commit in inglese, Conventional Commits.
- Nessun segreto nel repository: le chiavi Supabase stanno in `.env.local`, che è in `.gitignore`.

---

### Task 1: Scaffold del progetto e toolchain di test

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.local.example`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `lib/utils.ts`
- Test: `lib/utils.test.ts`

**Interfaces:**
- Consumes: niente (primo task).
- Produces: `cn(...inputs: ClassValue[]): string` da `lib/utils.ts`; script npm `dev`, `build`, `test`, `test:e2e`.

- [ ] **Step 1: Creare il progetto Next.js**

Eseguire dalla cartella padre, accettando la cartella esistente:

```bash
cd /Users/raoulpersonale/gestionale-termoidraulica
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*" --no-turbopack --yes
```

Se `create-next-app` rifiuta la cartella perché non è vuota, spostare `docs/` e `.git/` non è necessario: usare `--yes` e confermare la sovrascrittura dei soli file di scaffold. Verificare che `docs/` e `.gitignore` siano ancora presenti dopo il comando.

- [ ] **Step 2: Installare le dipendenze del progetto**

```bash
npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable idb-keyval clsx tailwind-merge lucide-react date-fns
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test fake-indexeddb
```

- [ ] **Step 3: Configurare Vitest**

Creare `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Creare `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

Aggiungere a `package.json` negli script:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Scrivere il test di `cn`**

Creare `lib/utils.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('unisce le classi', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm')
  })

  it('l ultima classe in conflitto vince', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('ignora i valori falsy', () => {
    expect(cn('p-2', false, undefined, 'm-1')).toBe('p-2 m-1')
  })
})
```

- [ ] **Step 5: Verificare che il test fallisca**

Run: `npx vitest run lib/utils.test.ts`
Expected: FAIL — `Failed to resolve import "./utils"` oppure `cn is not a function`.

- [ ] **Step 6: Implementare `cn`**

Creare `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Verificare che il test passi**

Run: `npx vitest run lib/utils.test.ts`
Expected: PASS, 3 test.

- [ ] **Step 8: Documentare le variabili d'ambiente**

Creare `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=chiave-anon-locale
SUPABASE_SERVICE_ROLE_KEY=chiave-service-role-solo-per-i-test
```

Verificare che `.gitignore` contenga `.env*.local`.

- [ ] **Step 9: Verificare che il build passi**

Run: `npm run build`
Expected: build completato senza errori.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Vitest and Playwright"
```

---

### Task 2: Schema del database

**Files:**
- Create: `supabase/config.toml` (generato dalla CLI)
- Create: `supabase/migrations/0001_schema.sql`
- Test: `supabase/tests/0001_schema.test.sql` — verifica manuale via `psql`, più il test di Task 4 sui calcoli

**Interfaces:**
- Consumes: niente.
- Produces: le dieci tabelle `utenti`, `clienti`, `sedi`, `impianti`, `materiali`, `interventi`, `rapportini`, `rapportino_ore`, `rapportino_materiali`, `impostazioni`; i tipi enum `ruolo_utente`, `tipo_impianto`, `priorita_intervento`, `stato_intervento`, `tipo_ora`, `stato_fatturazione`.

- [ ] **Step 1: Inizializzare Supabase in locale**

```bash
npx supabase init
npx supabase start
```

Annotare `API URL`, `anon key` e `service_role key` stampati da `supabase start` e copiarli in `.env.local`.

- [ ] **Step 2: Creare la migrazione dello schema**

Creare `supabase/migrations/0001_schema.sql`:

```sql
-- Tipi enum, tutti in italiano
create type ruolo_utente as enum ('tecnico', 'ufficio', 'titolare');
create type tipo_impianto as enum ('caldaia', 'condizionatore', 'pompa_calore', 'altro');
create type priorita_intervento as enum ('bassa', 'normale', 'urgente');
create type stato_intervento as enum ('programmato', 'in_corso', 'chiuso', 'annullato');
create type tipo_ora as enum ('viaggio', 'ordinario', 'urgenza');
create type stato_fatturazione as enum ('da_fatturare', 'fatturato', 'non_fatturabile');

-- Trigger condiviso per aggiornato_il
create or replace function tocca_aggiornato_il()
returns trigger
language plpgsql
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
  colore text not null default '#2563eb',
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
  prossima_manutenzione date generated always as (
    (ultima_manutenzione + make_interval(months => intervallo_mesi))::date
  ) stored,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  -- Bersaglio della chiave esterna composta di interventi: lega l'impianto
  -- alla sua sede, così un intervento non può puntare all'impianto di un altro.
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
  -- L'impianto deve appartenere alla sede dell'intervento. Con impianto_id
  -- nullo il vincolo non si applica (MATCH SIMPLE). Gli impianti si dismettono
  -- con attivo = false, non si cancellano: da qui il restrict.
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

-- Trigger di aggiornamento
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
```

- [ ] **Step 3: Applicare la migrazione**

Run: `npx supabase db reset`
Expected: la migrazione viene applicata senza errori e la CLI stampa `Finished supabase db reset`.

- [ ] **Step 4: Verificare la colonna generata**

Run:

```bash
npx supabase db execute --sql "
  insert into clienti (ragione_sociale) values ('Prova') returning id;
"
```

Poi, con l'id restituito, verificare che la scadenza sia calcolata dal database:

```bash
npx supabase db execute --sql "
  with c as (insert into clienti (ragione_sociale) values ('Verifica') returning id),
       s as (insert into sedi (cliente_id, indirizzo) select id, 'Via Prova 1' from c returning id)
  insert into impianti (sede_id, tipo, ultima_manutenzione, intervallo_mesi)
  select id, 'caldaia', '2026-01-15', 12 from s
  returning ultima_manutenzione, intervallo_mesi, prossima_manutenzione;
"
```

Expected: `prossima_manutenzione` = `2027-01-15`.

- [ ] **Step 5: Verificare i vincoli su prezzi e relazioni**

Run:

```bash
npx supabase db execute --sql "
  insert into materiali (codice, descrizione, prezzo_vendita)
  values ('NEG-1', 'Prezzo negativo', -1);
"
```

Expected: errore `violates check constraint "materiali_prezzo_vendita_check"`.

Run:

```bash
npx supabase db execute --sql "
  with ca as (insert into clienti (ragione_sociale) values ('Cliente A') returning id),
       cb as (insert into clienti (ragione_sociale) values ('Cliente B') returning id),
       sa as (insert into sedi (cliente_id, indirizzo) select id, 'Via A 1' from ca returning id),
       sb as (insert into sedi (cliente_id, indirizzo) select id, 'Via B 2' from cb returning id),
       ia as (insert into impianti (sede_id, tipo) select id, 'caldaia' from sa returning id)
  insert into interventi (sede_id, impianto_id, data, descrizione)
  select sb.id, ia.id, current_date, 'Impianto di un altra sede' from sb, ia;
"
```

Expected: errore `violates foreign key constraint "interventi_impianto_della_sede"` — l'impianto di una sede non è indicabile da un intervento su un'altra.

- [ ] **Step 6: Verificare il vincolo di idempotenza**

Run:

```bash
npx supabase db execute --sql "
  select conname from pg_constraint
  where conrelid = 'rapportini'::regclass and contype = 'u';
"
```

Expected: una riga, il vincolo unique su `intervento_id`.

- [ ] **Step 7: Commit**

```bash
git add supabase
git commit -m "feat(db): add italian schema for clients, jobs, reports and price list"
```

---

### Task 3: Row Level Security e protezione dei costi

**Files:**
- Create: `supabase/migrations/0002_rls.sql`
- Test: `tests/rls.test.ts`

**Interfaces:**
- Consumes: le tabelle di Task 2.
- Produces: la funzione SQL `ruolo_corrente() returns ruolo_utente`; le policy RLS; la vista `interventi_con_margine` leggibile solo dal titolare.

- [ ] **Step 1: Scrivere la migrazione RLS**

Creare `supabase/migrations/0002_rls.sql`:

```sql
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

-- utenti: ognuno legge se stesso; ufficio e titolare leggono tutti
create policy utenti_lettura on utenti for select
  using (id = auth.uid() or ruolo_corrente() in ('ufficio', 'titolare'));
create policy utenti_scrittura on utenti for update
  using (ruolo_corrente() = 'titolare');

-- anagrafiche: lettura a tutti gli autenticati, scrittura a ufficio e titolare
create policy clienti_lettura on clienti for select using (auth.uid() is not null);
create policy clienti_inserimento on clienti for insert
  with check (auth.uid() is not null);
create policy clienti_modifica on clienti for update
  using (ruolo_corrente() in ('ufficio', 'titolare'));

create policy sedi_lettura on sedi for select using (auth.uid() is not null);
create policy sedi_inserimento on sedi for insert with check (auth.uid() is not null);
create policy sedi_modifica on sedi for update
  using (ruolo_corrente() in ('ufficio', 'titolare'));

create policy impianti_lettura on impianti for select using (auth.uid() is not null);
create policy impianti_scrittura on impianti for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy materiali_lettura on materiali for select using (auth.uid() is not null);
create policy materiali_scrittura on materiali for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));

create policy impostazioni_lettura on impostazioni for select
  using (auth.uid() is not null);
create policy impostazioni_scrittura on impostazioni for update
  using (ruolo_corrente() = 'titolare');

-- interventi: il tecnico vede solo i propri
create policy interventi_lettura on interventi for select
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());
create policy interventi_scrittura_ufficio on interventi for all
  using (ruolo_corrente() in ('ufficio', 'titolare'))
  with check (ruolo_corrente() in ('ufficio', 'titolare'));
create policy interventi_stato_tecnico on interventi for update
  using (tecnico_id = auth.uid())
  with check (tecnico_id = auth.uid());

-- rapportini: il tecnico scrive i propri, l ufficio li gestisce tutti
create policy rapportini_lettura on rapportini for select
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());
create policy rapportini_inserimento on rapportini for insert
  with check (tecnico_id = auth.uid() or ruolo_corrente() in ('ufficio', 'titolare'));
create policy rapportini_modifica on rapportini for update
  using (ruolo_corrente() in ('ufficio', 'titolare') or tecnico_id = auth.uid());

-- righe: seguono il rapportino padre
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

-- Le colonne di costo restano leggibili solo al titolare. Le policy RLS
-- filtrano righe, non colonne, quindi il filtro va fatto con i privilegi.
--
-- Attenzione al modo: un "revoke select (colonna)" non toglie niente a un ruolo
-- che ha già select sull'intera tabella, ed è esattamente quello che Supabase
-- concede ad anon e authenticated. Va quindi revocato il privilegio di tabella
-- e riconcesso colonna per colonna.
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

-- Le scritture restano necessarie a tecnici e ufficio: le policy RLS decidono
-- quali righe, i privilegi quali colonne.
grant insert, update, delete on rapportino_ore, rapportino_materiali to authenticated;
grant insert, update on rapportini to authenticated;

-- Conseguenza da tenere presente: anon, authenticated e service_role sono ruoli
-- Postgres, mentre tecnico, ufficio e titolare sono valori di una colonna. La
-- revoca vale quindi anche per il titolare, che è comunque authenticated. Ogni
-- lettura di costi passa da una funzione security definer che controlla il
-- ruolo: margini() per gli interventi, listino_con_costi() per il listino.
-- Nessuna query dell'applicazione chiede mai una colonna di costo direttamente.
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
  -- Un costo orario a zero significa che in anagrafica manca la tariffa del
  -- tecnico, non che il lavoro è gratis: il margine va mostrato come incompleto
  -- invece di essere sommato come un dato buono.
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

revoke all on interventi_con_margine from authenticated;

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
```

- [ ] **Step 2: Scrivere il test RLS**

Creare `tests/rls.test.ts`. Il test crea tre utenti reali via API di amministrazione, poi interroga con la loro sessione.

```typescript
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(url, service, { auth: { persistSession: false } })

async function creaUtente(email: string, ruolo: 'tecnico' | 'ufficio' | 'titolare') {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'prova-1234',
    email_confirm: true,
  })
  if (error && !error.message.includes('already been registered')) throw error
  const id =
    data?.user?.id ??
    (await admin.from('utenti').select('id').eq('nome', email).single()).data!.id
  await admin.from('utenti').upsert({ id, nome: email, ruolo, tariffa_costo_oraria: 22 })
  const sessione = createClient(url, anon, { auth: { persistSession: false } })
  const { error: errLogin } = await sessione.auth.signInWithPassword({
    email,
    password: 'prova-1234',
  })
  if (errLogin) throw errLogin
  return sessione
}

let tecnico: Awaited<ReturnType<typeof creaUtente>>
let ufficio: Awaited<ReturnType<typeof creaUtente>>
let titolare: Awaited<ReturnType<typeof creaUtente>>

beforeAll(async () => {
  tecnico = await creaUtente('tecnico@prova.test', 'tecnico')
  ufficio = await creaUtente('ufficio@prova.test', 'ufficio')
  titolare = await creaUtente('titolare@prova.test', 'titolare')
}, 30_000)

describe('RLS', () => {
  it('il tecnico non legge il prezzo di acquisto dei materiali', async () => {
    const { error } = await tecnico.from('materiali').select('prezzo_acquisto').limit(1)
    expect(error).not.toBeNull()
  })

  it('il tecnico legge il prezzo di vendita dei materiali', async () => {
    const { error } = await tecnico.from('materiali').select('codice,prezzo_vendita').limit(1)
    expect(error).toBeNull()
  })

  it("l'ufficio non legge la tariffa di costo dei tecnici", async () => {
    const { error } = await ufficio.from('utenti').select('tariffa_costo_oraria').limit(1)
    expect(error).not.toBeNull()
  })

  it('nemmeno il titolare legge i costi in query diretta: authenticated è un solo ruolo', async () => {
    const { error } = await titolare.from('materiali').select('prezzo_acquisto').limit(1)
    expect(error).not.toBeNull()
  })

  it('il titolare legge i costi dalla funzione dedicata, gli altri no', async () => {
    const perTitolare = await titolare.rpc('listino_con_costi')
    const perUfficio = await ufficio.rpc('listino_con_costi')

    expect(perTitolare.error).toBeNull()
    expect((perTitolare.data ?? []).length).toBeGreaterThan(0)
    expect((perUfficio.data ?? [])).toHaveLength(0)
  })

  it('solo il titolare ottiene righe da margini()', async () => {
    const periodo = { dal: '2026-01-01', al: '2026-12-31' }
    const perUfficio = await ufficio.rpc('margini', periodo)
    const perTitolare = await titolare.rpc('margini', periodo)
    expect(perUfficio.data ?? []).toHaveLength(0)
    expect(perTitolare.error).toBeNull()
  })

  it('il tecnico non vede gli interventi di altri tecnici', async () => {
    const { data: altro } = await admin.from('utenti').select('id').eq('nome', 'ufficio@prova.test').single()
    const { data: cliente } = await admin.from('clienti').insert({ ragione_sociale: 'RLS Spa' }).select('id').single()
    const { data: sede } = await admin.from('sedi').insert({ cliente_id: cliente!.id, indirizzo: 'Via RLS 1' }).select('id').single()
    await admin.from('interventi').insert({
      sede_id: sede!.id,
      tecnico_id: altro!.id,
      data: '2026-06-01',
      descrizione: 'Non mio',
    })
    const { data } = await tecnico.from('interventi').select('id,descrizione').eq('descrizione', 'Non mio')
    expect(data ?? []).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Verificare che il test fallisca**

Run: `npx supabase db reset && npx vitest run tests/rls.test.ts`
Expected: FAIL — senza la migrazione `0002` le colonne di costo sono leggibili e `margini` non esiste.

Questo fallimento è il punto del task: con i soli `revoke` di colonna il test
sarebbe fallito allo stesso modo, perché il privilegio di tabella concesso da
Supabase resta. Se un giorno il test passa senza la revoca di tabella, è la
revoca a essere diventata inutile, non il test.

- [ ] **Step 4: Applicare la migrazione**

Run: `npx supabase db reset`
Expected: entrambe le migrazioni applicate.

- [ ] **Step 5: Verificare che il test passi**

Run: `npx vitest run tests/rls.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_rls.sql tests/rls.test.ts
git commit -m "feat(db): enforce role permissions with RLS and hide cost columns"
```

---

### Task 4: Seed di listino e dati di prova

**Files:**
- Create: `supabase/seed.sql`
- Modify: `package.json` (script `db:reset`)

**Interfaces:**
- Consumes: lo schema di Task 2.
- Produces: dati di prova con cui sviluppare le schermate: tre clienti, quattro sedi, tre impianti, venti materiali, interventi sulla data corrente.

- [ ] **Step 1: Scrivere il seed**

Creare `supabase/seed.sql`:

```sql
insert into materiali (codice, descrizione, unita, prezzo_acquisto, prezzo_vendita) values
  ('TUB-CU-15', 'Tubo rame ricotto 15 mm', 'm', 4.10, 7.50),
  ('TUB-CU-18', 'Tubo rame ricotto 18 mm', 'm', 5.30, 9.20),
  ('TUB-MU-16', 'Tubo multistrato 16x2', 'm', 2.40, 4.60),
  ('RAC-90-15', 'Curva 90 gradi 15 mm', 'pz', 1.10, 2.80),
  ('RAC-TE-15', 'Raccordo a T 15 mm', 'pz', 1.80, 4.10),
  ('RAC-NIP-12', 'Nipples ottone 1/2', 'pz', 0.90, 2.40),
  ('VAL-SFE-12', 'Valvola a sfera 1/2', 'pz', 4.50, 11.00),
  ('VAL-SFE-34', 'Valvola a sfera 3/4', 'pz', 6.20, 14.50),
  ('VAL-TER-15', 'Valvola termostatica 15 mm', 'pz', 12.00, 29.00),
  ('VAL-SIC-3', 'Valvola di sicurezza 3 bar', 'pz', 8.40, 19.00),
  ('GUA-CAN-12', 'Guarnizione canapa 1/2', 'pz', 0.20, 0.90),
  ('GUA-OR-20', 'Guarnizione OR 20 mm', 'pz', 0.30, 1.10),
  ('VAS-EXP-8', 'Vaso espansione 8 litri', 'pz', 22.00, 48.00),
  ('POM-CIR-25', 'Circolatore 25-40', 'pz', 78.00, 149.00),
  ('SON-NTC', 'Sonda NTC caldaia', 'pz', 9.50, 24.00),
  ('SCA-PIA-20', 'Scambiatore a piastre 20 elementi', 'pz', 64.00, 128.00),
  ('FIL-DEF-34', 'Filtro defangatore 3/4', 'pz', 31.00, 69.00),
  ('GAS-R32-1', 'Ricarica gas R32 per kg', 'kg', 14.00, 35.00),
  ('STA-TUB-16', 'Staffa per tubo 16 mm', 'pz', 0.40, 1.30),
  ('MAN-PRE-4', 'Manometro 0-4 bar', 'pz', 7.10, 17.50);

with c as (
  insert into clienti (ragione_sociale, partita_iva, telefono, email) values
    ('Condominio Via Manzoni 14', null, '0301234567', 'amministratore@viamanzoni14.test'),
    ('Panificio Rossi S.r.l.', '01234567890', '0307654321', 'info@panificiorossi.test'),
    ('Bianchi Marco', null, '3391112223', 'marco.bianchi@posta.test')
  returning id, ragione_sociale
),
s as (
  insert into sedi (cliente_id, etichetta, indirizzo, comune, cap, note_accesso)
  select id, 'Sede principale', 'Via Manzoni 14', 'Brescia', '25121', 'Chiavi dal portiere'
  from c where ragione_sociale = 'Condominio Via Manzoni 14'
  union all
  select id, 'Laboratorio', 'Via Industriale 8', 'Brescia', '25125', 'Aperto dalle 5 alle 13'
  from c where ragione_sociale = 'Panificio Rossi S.r.l.'
  union all
  select id, 'Negozio', 'Corso Zanardelli 40', 'Brescia', '25121', null
  from c where ragione_sociale = 'Panificio Rossi S.r.l.'
  union all
  select id, 'Abitazione', 'Via Sereno 3', 'Rezzato', '25086', 'Citofono Bianchi'
  from c where ragione_sociale = 'Bianchi Marco'
  returning id, etichetta, cliente_id
)
insert into impianti (sede_id, tipo, marca, modello, matricola, ultima_manutenzione, intervallo_mesi)
select id, 'caldaia', 'Vaillant', 'ecoTEC plus', 'VA-88120', current_date - interval '13 months', 12
  from s where etichetta = 'Sede principale'
union all
select id, 'condizionatore', 'Daikin', 'Perfera 12', 'DK-55021', current_date - interval '11 months', 12
  from s where etichetta = 'Negozio'
union all
select id, 'pompa_calore', 'Mitsubishi', 'Ecodan 8kW', 'MI-70310', current_date - interval '5 months', 12
  from s where etichetta = 'Abitazione';
```

- [ ] **Step 2: Aggiungere lo script npm**

In `package.json`, aggiungere:

```json
"db:reset": "supabase db reset"
```

- [ ] **Step 3: Applicare e verificare**

Run: `npm run db:reset`
Expected: `Finished supabase db reset`, seed applicato.

Run:

```bash
npx supabase db execute --sql "
  select count(*) as materiali from materiali;
  select ragione_sociale, count(*) as sedi from clienti
    join sedi on sedi.cliente_id = clienti.id group by 1 order by 1;
  select tipo, prossima_manutenzione,
    prossima_manutenzione < current_date as scaduto from impianti order by 2;
"
```

Expected: 20 materiali; il condominio ha una sede scaduta (`scaduto` = `t`).

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql package.json
git commit -m "feat(db): seed price list, sample customers and installations"
```

---

### Task 5: Client Supabase, tipi e instradamento per ruolo

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/tipi.ts`
- Create: `lib/sessione.ts`
- Create: `middleware.ts`
- Create: `app/login/page.tsx`, `app/login/azioni.ts`
- Create: `app/(tecnico)/layout.tsx`, `app/(ufficio)/layout.tsx`, `app/(titolare)/layout.tsx`
- Modify: `app/page.tsx`
- Test: `lib/sessione.test.ts`

**Interfaces:**
- Consumes: lo schema di Task 2, le policy di Task 3.
- Produces:
  - `clientBrowser(): SupabaseClient<Database>` da `lib/supabase/client.ts`
  - `clientServer(): Promise<SupabaseClient<Database>>` da `lib/supabase/server.ts`
  - `utenteCorrente(): Promise<Utente | null>` e `richiediRuolo(ruoli: Ruolo[]): Promise<Utente>` da `lib/sessione.ts`
  - `homePerRuolo(ruolo: Ruolo): string` da `lib/sessione.ts`
  - i tipi `Database`, `Utente`, `Ruolo` da `lib/supabase/tipi.ts`

- [ ] **Step 1: Generare i tipi dal database**

```bash
npx supabase gen types typescript --local > lib/supabase/database.ts
```

Creare `lib/supabase/tipi.ts` come punto unico di riesportazione:

```typescript
import type { Database } from './database'

export type { Database }

export type Tabelle = Database['public']['Tables']
export type Utente = Tabelle['utenti']['Row']
export type Cliente = Tabelle['clienti']['Row']
export type Sede = Tabelle['sedi']['Row']
export type Impianto = Tabelle['impianti']['Row']
export type Materiale = Tabelle['materiali']['Row']
export type Intervento = Tabelle['interventi']['Row']
export type Rapportino = Tabelle['rapportini']['Row']
export type RigaOre = Tabelle['rapportino_ore']['Row']
export type RigaMateriale = Tabelle['rapportino_materiali']['Row']
export type Impostazioni = Tabelle['impostazioni']['Row']

export type Ruolo = Database['public']['Enums']['ruolo_utente']
export type TipoOra = Database['public']['Enums']['tipo_ora']
export type Priorita = Database['public']['Enums']['priorita_intervento']
export type StatoIntervento = Database['public']['Enums']['stato_intervento']
export type TipoImpianto = Database['public']['Enums']['tipo_impianto']
```

- [ ] **Step 2: Scrivere i client Supabase**

Creare `lib/supabase/client.ts`:

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './tipi'

export function clientBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

Creare `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './tipi'

export async function clientServer() {
  const store = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (elenco) => {
          try {
            elenco.forEach(({ name, value, options }) => store.set(name, value, options))
          } catch {
            // Chiamato da un Server Component: il refresh del cookie
            // lo fa il middleware, qui si ignora.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 3: Scrivere il test di `homePerRuolo`**

Creare `lib/sessione.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { homePerRuolo } from './sessione'

describe('homePerRuolo', () => {
  it('porta il tecnico alla lista di oggi', () => {
    expect(homePerRuolo('tecnico')).toBe('/oggi')
  })

  it('porta l ufficio al planning', () => {
    expect(homePerRuolo('ufficio')).toBe('/planning')
  })

  it('porta il titolare alla dashboard', () => {
    expect(homePerRuolo('titolare')).toBe('/dashboard')
  })
})
```

- [ ] **Step 4: Verificare che il test fallisca**

Run: `npx vitest run lib/sessione.test.ts`
Expected: FAIL — `Failed to resolve import "./sessione"`.

- [ ] **Step 5: Implementare `lib/sessione.ts`**

```typescript
import { redirect } from 'next/navigation'
import { clientServer } from './supabase/server'
import type { Ruolo, Utente } from './supabase/tipi'

export function homePerRuolo(ruolo: Ruolo): string {
  switch (ruolo) {
    case 'tecnico':
      return '/oggi'
    case 'ufficio':
      return '/planning'
    case 'titolare':
      return '/dashboard'
  }
}

export async function utenteCorrente(): Promise<Utente | null> {
  const supabase = await clientServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('utenti').select('*').eq('id', user.id).single()
  return data ?? null
}

export async function richiediRuolo(ruoli: Ruolo[]): Promise<Utente> {
  const utente = await utenteCorrente()
  if (!utente) redirect('/login')
  if (!ruoli.includes(utente.ruolo)) redirect(homePerRuolo(utente.ruolo))
  return utente
}
```

- [ ] **Step 6: Verificare che il test passi**

Run: `npx vitest run lib/sessione.test.ts`
Expected: PASS, 3 test.

- [ ] **Step 7: Scrivere il middleware di refresh sessione**

Creare `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let risposta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (elenco) => {
          elenco.forEach(({ name, value }) => request.cookies.set(name, value))
          risposta = NextResponse.next({ request })
          elenco.forEach(({ name, value, options }) =>
            risposta.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pubbliche = ['/login', '/manifest.webmanifest']
  const isPubblica = pubbliche.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPubblica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return risposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
}
```

- [ ] **Step 8: Scrivere la pagina di login**

Creare `app/login/azioni.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { clientServer } from '@/lib/supabase/server'
import { homePerRuolo } from '@/lib/sessione'

export async function accedi(_precedente: unknown, dati: FormData) {
  const email = String(dati.get('email') ?? '')
  const password = String(dati.get('password') ?? '')
  const supabase = await clientServer()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { errore: 'Email o password non validi.' }

  const { data: utente } = await supabase
    .from('utenti')
    .select('ruolo')
    .eq('id', data.user.id)
    .single()

  redirect(homePerRuolo(utente?.ruolo ?? 'tecnico'))
}
```

Creare `app/login/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { accedi } from './azioni'

export default function Login() {
  const [stato, azione, inCorso] = useActionState(accedi, null)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Accedi</h1>
      <form action={azione} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="h-14 rounded-xl border px-4 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-14 rounded-xl border px-4 text-base"
          />
        </label>
        {stato?.errore && <p className="text-sm text-red-600">{stato.errore}</p>}
        <button
          type="submit"
          disabled={inCorso}
          className="h-14 rounded-xl bg-blue-600 text-base font-medium text-white disabled:opacity-60"
        >
          {inCorso ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 9: Scrivere i layout per ruolo e la home di smistamento**

Creare `app/(tecnico)/layout.tsx`:

```tsx
import { richiediRuolo } from '@/lib/sessione'

export default async function LayoutTecnico({ children }: { children: React.ReactNode }) {
  const utente = await richiediRuolo(['tecnico'])
  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <span className="text-base font-semibold">{utente.nome}</span>
        <span className="text-xs uppercase tracking-wide text-slate-500">Tecnico</span>
      </header>
      {children}
    </div>
  )
}
```

Creare `app/(ufficio)/layout.tsx` con la stessa struttura ma `richiediRuolo(['ufficio', 'titolare'])`, una barra di navigazione orizzontale verso `/planning`, `/rapportini`, `/scadenzario`, e nessun padding inferiore.

Creare `app/(titolare)/layout.tsx` con `richiediRuolo(['titolare'])` e navigazione verso `/dashboard`, `/planning`, `/rapportini`.

Sostituire `app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { homePerRuolo, utenteCorrente } from '@/lib/sessione'

export default async function Home() {
  const utente = await utenteCorrente()
  redirect(utente ? homePerRuolo(utente.ruolo) : '/login')
}
```

- [ ] **Step 10: Verificare a mano il reindirizzamento**

Creare tre utenti di prova:

```bash
npx supabase db execute --sql "select email from auth.users order by email;"
```

Se vuoti, crearli con lo script del test RLS (`npx vitest run tests/rls.test.ts`), poi:

Run: `npm run dev`
Expected: `http://localhost:3000` reindirizza a `/login`; l'accesso con `tecnico@prova.test` / `prova-1234` arriva su `/oggi`; con `ufficio@prova.test` su `/planning`; aprire `/planning` da tecnico rimanda a `/oggi`.

- [ ] **Step 11: Commit**

```bash
git add lib middleware.ts app
git commit -m "feat(auth): add Supabase clients, session helpers and role-based routing"
```

---

### Task 6: Calcoli di totali e margini

**Files:**
- Create: `lib/calcoli.ts`
- Test: `lib/calcoli.test.ts`

**Interfaces:**
- Consumes: i tipi `TipoOra` da `lib/supabase/tipi.ts`.
- Produces:
  - `type RigaOreCalcolo = { tipo: TipoOra; minuti: number; prezzo_orario: number; costo_orario?: number }`
  - `type RigaMaterialeCalcolo = { quantita: number; prezzo_vendita: number; prezzo_acquisto?: number }`
  - `type TotaliIntervento = { ricavoOre: number; costoOre: number; ricavoMateriali: number; costoMateriali: number; totale: number; margine: number; marginePercentuale: number }`
  - `calcolaTotali(ore, materiali): TotaliIntervento`
  - `formattaEuro(valore: number): string`
  - `formattaOre(minuti: number): string`
  - `statoScadenza(prossima: string | null, oggi?: Date): 'scaduto' | 'in_scadenza' | 'ok' | 'sconosciuto'`

- [ ] **Step 1: Scrivere i test**

Creare `lib/calcoli.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { calcolaTotali, formattaEuro, formattaOre, statoScadenza } from './calcoli'

describe('calcolaTotali', () => {
  it('somma ore e materiali con i prezzi congelati nelle righe', () => {
    const totali = calcolaTotali(
      [
        { tipo: 'viaggio', minuti: 30, prezzo_orario: 30, costo_orario: 22 },
        { tipo: 'ordinario', minuti: 90, prezzo_orario: 40, costo_orario: 22 },
      ],
      [
        { quantita: 2, prezzo_vendita: 11, prezzo_acquisto: 4.5 },
        { quantita: 3.5, prezzo_vendita: 4.6, prezzo_acquisto: 2.4 },
      ],
    )

    expect(totali.ricavoOre).toBeCloseTo(75, 2)
    expect(totali.costoOre).toBeCloseTo(44, 2)
    expect(totali.ricavoMateriali).toBeCloseTo(38.1, 2)
    expect(totali.costoMateriali).toBeCloseTo(17.4, 2)
    expect(totali.totale).toBeCloseTo(113.1, 2)
    expect(totali.margine).toBeCloseTo(51.7, 2)
  })

  it('tratta i costi assenti come zero, cosi ufficio e tecnico vedono solo i ricavi', () => {
    const totali = calcolaTotali(
      [{ tipo: 'ordinario', minuti: 60, prezzo_orario: 40 }],
      [{ quantita: 1, prezzo_vendita: 10 }],
    )

    expect(totali.totale).toBeCloseTo(50, 2)
    expect(totali.costoOre).toBe(0)
    expect(totali.costoMateriali).toBe(0)
    expect(totali.margine).toBeCloseTo(50, 2)
  })

  it('restituisce zeri su un rapportino vuoto senza dividere per zero', () => {
    const totali = calcolaTotali([], [])
    expect(totali.totale).toBe(0)
    expect(totali.margine).toBe(0)
    expect(totali.marginePercentuale).toBe(0)
  })

  it('calcola la percentuale di margine sul totale', () => {
    const totali = calcolaTotali(
      [{ tipo: 'ordinario', minuti: 60, prezzo_orario: 100, costo_orario: 25 }],
      [],
    )
    expect(totali.marginePercentuale).toBeCloseTo(75, 2)
  })

  it('non arrotonda i minuti in modo da perdere i quarti d ora', () => {
    const totali = calcolaTotali([{ tipo: 'ordinario', minuti: 15, prezzo_orario: 40 }], [])
    expect(totali.ricavoOre).toBeCloseTo(10, 2)
  })
})

describe('formattaEuro', () => {
  it('arrotonda a due decimali in presentazione', () => {
    expect(formattaEuro(113.1)).toBe('113,10 €')
    expect(formattaEuro(0)).toBe('0,00 €')
  })
})

describe('formattaOre', () => {
  it('mostra ore e minuti', () => {
    expect(formattaOre(90)).toBe('1 h 30 min')
    expect(formattaOre(60)).toBe('1 h')
    expect(formattaOre(45)).toBe('45 min')
    expect(formattaOre(0)).toBe('0 min')
  })
})

describe('statoScadenza', () => {
  const oggi = new Date('2026-09-12T10:00:00Z')

  it('segna scaduto quando la data e passata', () => {
    expect(statoScadenza('2026-08-01', oggi)).toBe('scaduto')
  })

  it('segna in scadenza entro trenta giorni', () => {
    expect(statoScadenza('2026-10-05', oggi)).toBe('in_scadenza')
  })

  it('segna ok oltre trenta giorni', () => {
    expect(statoScadenza('2027-01-01', oggi)).toBe('ok')
  })

  it('segna sconosciuto senza data', () => {
    expect(statoScadenza(null, oggi)).toBe('sconosciuto')
  })

  it('considera oggi stesso come in scadenza, non come scaduto', () => {
    expect(statoScadenza('2026-09-12', oggi)).toBe('in_scadenza')
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run lib/calcoli.test.ts`
Expected: FAIL — `Failed to resolve import "./calcoli"`.

- [ ] **Step 3: Implementare `lib/calcoli.ts`**

```typescript
import type { TipoOra } from './supabase/tipi'

export type RigaOreCalcolo = {
  tipo: TipoOra
  minuti: number
  prezzo_orario: number
  costo_orario?: number | null
}

export type RigaMaterialeCalcolo = {
  quantita: number
  prezzo_vendita: number
  prezzo_acquisto?: number | null
}

export type TotaliIntervento = {
  ricavoOre: number
  costoOre: number
  ricavoMateriali: number
  costoMateriali: number
  totale: number
  margine: number
  marginePercentuale: number
}

export function calcolaTotali(
  ore: RigaOreCalcolo[],
  materiali: RigaMaterialeCalcolo[],
): TotaliIntervento {
  const ricavoOre = ore.reduce((s, r) => s + (r.minuti / 60) * r.prezzo_orario, 0)
  const costoOre = ore.reduce((s, r) => s + (r.minuti / 60) * (r.costo_orario ?? 0), 0)
  const ricavoMateriali = materiali.reduce((s, r) => s + r.quantita * r.prezzo_vendita, 0)
  const costoMateriali = materiali.reduce(
    (s, r) => s + r.quantita * (r.prezzo_acquisto ?? 0),
    0,
  )

  const totale = ricavoOre + ricavoMateriali
  const margine = totale - costoOre - costoMateriali

  return {
    ricavoOre,
    costoOre,
    ricavoMateriali,
    costoMateriali,
    totale,
    margine,
    marginePercentuale: totale === 0 ? 0 : (margine / totale) * 100,
  }
}

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

export function formattaEuro(valore: number): string {
  // Intl usa lo spazio insecabile prima del simbolo: normalizzato a spazio semplice.
  return euro.format(valore).replace(/ /g, ' ')
}

export function formattaOre(minuti: number): string {
  if (minuti <= 0) return '0 min'
  const ore = Math.floor(minuti / 60)
  const resto = minuti % 60
  if (ore === 0) return `${resto} min`
  if (resto === 0) return `${ore} h`
  return `${ore} h ${resto} min`
}

export function statoScadenza(
  prossima: string | null,
  oggi: Date = new Date(),
): 'scaduto' | 'in_scadenza' | 'ok' | 'sconosciuto' {
  if (!prossima) return 'sconosciuto'
  const giorno = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const scadenza = giorno(new Date(`${prossima}T00:00:00Z`))
  const adesso = giorno(oggi)
  if (scadenza < adesso) return 'scaduto'
  const giorniMancanti = (scadenza - adesso) / 86_400_000
  return giorniMancanti <= 30 ? 'in_scadenza' : 'ok'
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run lib/calcoli.test.ts`
Expected: PASS, 14 test.

Se `formattaEuro` fallisce per il separatore, il problema è la normalizzazione dello spazio insecabile: il test attende `113,10 €` con spazio semplice.

- [ ] **Step 5: Commit**

```bash
git add lib/calcoli.ts lib/calcoli.test.ts
git commit -m "feat: add pure calculations for job totals, margin and maintenance due dates"
```

---

### Task 7: Bozza locale e coda di invio offline

**Files:**
- Create: `lib/bozza.ts`
- Test: `lib/bozza.test.ts`

**Interfaces:**
- Consumes: i tipi `TipoOra` da `lib/supabase/tipi.ts`, `RigaOreCalcolo` e `RigaMaterialeCalcolo` da `lib/calcoli.ts`.
- Produces:
  - `type BozzaRapportino = { interventoId: string; ore: RigaOreBozza[]; materiali: RigaMaterialeBozza[]; note: string; firmatario: string; firmaDataUrl: string | null; timerAvviatoIl: number | null; aggiornataIl: number }`
  - `bozzaVuota(interventoId: string): BozzaRapportino`
  - `leggiBozza(interventoId): Promise<BozzaRapportino | null>`
  - `salvaBozza(bozza): Promise<void>`
  - `eliminaBozza(interventoId): Promise<void>`
  - `accodaInvio(bozza): Promise<void>`
  - `leggiCoda(): Promise<BozzaRapportino[]>`
  - `svuotaCoda(interventoId): Promise<void>`
  - `elaboraCoda(invia: (b: BozzaRapportino) => Promise<void>): Promise<{ inviati: number; rimasti: number }>`
  - `minutiTimer(avviatoIl: number | null, adesso?: number): number`

- [ ] **Step 1: Scrivere i test**

Creare `lib/bozza.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  accodaInvio,
  bozzaVuota,
  elaboraCoda,
  eliminaBozza,
  leggiBozza,
  leggiCoda,
  minutiTimer,
  salvaBozza,
} from './bozza'

beforeEach(async () => {
  const { clear } = await import('idb-keyval')
  await clear()
})

describe('bozza locale', () => {
  it('salva e rilegge una bozza per intervento', async () => {
    const bozza = bozzaVuota('int-1')
    bozza.note = 'Sostituita valvola'
    bozza.ore.push({ tipo: 'ordinario', minuti: 60, prezzo_orario: 40 })
    await salvaBozza(bozza)

    const riletta = await leggiBozza('int-1')
    expect(riletta?.note).toBe('Sostituita valvola')
    expect(riletta?.ore).toHaveLength(1)
  })

  it('non confonde le bozze di due interventi', async () => {
    await salvaBozza({ ...bozzaVuota('int-1'), note: 'primo' })
    await salvaBozza({ ...bozzaVuota('int-2'), note: 'secondo' })
    expect((await leggiBozza('int-1'))?.note).toBe('primo')
    expect((await leggiBozza('int-2'))?.note).toBe('secondo')
  })

  it('restituisce null per un intervento senza bozza', async () => {
    expect(await leggiBozza('mai-visto')).toBeNull()
  })

  it('elimina la bozza', async () => {
    await salvaBozza(bozzaVuota('int-1'))
    await eliminaBozza('int-1')
    expect(await leggiBozza('int-1')).toBeNull()
  })
})

describe('coda di invio', () => {
  it('accoda la bozza e la conserva in coda', async () => {
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'da inviare' })
    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].interventoId).toBe('int-1')
  })

  it('accodare due volte lo stesso intervento lascia una sola voce aggiornata', async () => {
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'prima versione' })
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'seconda versione' })
    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].note).toBe('seconda versione')
  })

  it('elabora la coda e la svuota quando l invio riesce', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-2'))

    const invia = vi.fn().mockResolvedValue(undefined)
    const esito = await elaboraCoda(invia)

    expect(invia).toHaveBeenCalledTimes(2)
    expect(esito).toEqual({ inviati: 2, rimasti: 0 })
    expect(await leggiCoda()).toHaveLength(0)
  })

  it('tiene in coda le bozze il cui invio fallisce', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-2'))

    const invia = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rete assente'))
    const esito = await elaboraCoda(invia)

    expect(esito).toEqual({ inviati: 1, rimasti: 1 })
    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].interventoId).toBe('int-2')
  })

  it('una seconda elaborazione riprova solo ciò che era rimasto', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await elaboraCoda(vi.fn().mockRejectedValue(new Error('rete assente')))

    const invia = vi.fn().mockResolvedValue(undefined)
    const esito = await elaboraCoda(invia)

    expect(invia).toHaveBeenCalledTimes(1)
    expect(esito).toEqual({ inviati: 1, rimasti: 0 })
  })
})

describe('minutiTimer', () => {
  it('restituisce zero se il timer non e partito', () => {
    expect(minutiTimer(null)).toBe(0)
  })

  it('calcola i minuti dal timestamp di avvio, non da un contatore in memoria', () => {
    const avvio = Date.UTC(2026, 8, 12, 9, 0, 0)
    const adesso = Date.UTC(2026, 8, 12, 10, 31, 0)
    expect(minutiTimer(avvio, adesso)).toBe(91)
  })

  it('arrotonda per difetto i secondi', () => {
    const avvio = Date.UTC(2026, 8, 12, 9, 0, 0)
    expect(minutiTimer(avvio, avvio + 119_000)).toBe(1)
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run lib/bozza.test.ts`
Expected: FAIL — `Failed to resolve import "./bozza"`.

- [ ] **Step 3: Implementare `lib/bozza.ts`**

```typescript
import { del, get, set } from 'idb-keyval'
import type { TipoOra } from './supabase/tipi'

export type RigaOreBozza = {
  tipo: TipoOra
  minuti: number
  prezzo_orario: number
}

export type RigaMaterialeBozza = {
  materiale_id: string | null
  descrizione: string
  quantita: number
  prezzo_vendita: number
}

export type BozzaRapportino = {
  interventoId: string
  ore: RigaOreBozza[]
  materiali: RigaMaterialeBozza[]
  note: string
  firmatario: string
  firmaDataUrl: string | null
  timerAvviatoIl: number | null
  aggiornataIl: number
}

const chiaveBozza = (interventoId: string) => `bozza:${interventoId}`
const CHIAVE_CODA = 'coda-rapportini'

export function bozzaVuota(interventoId: string): BozzaRapportino {
  return {
    interventoId,
    ore: [],
    materiali: [],
    note: '',
    firmatario: '',
    firmaDataUrl: null,
    timerAvviatoIl: null,
    aggiornataIl: Date.now(),
  }
}

export async function leggiBozza(interventoId: string): Promise<BozzaRapportino | null> {
  return (await get<BozzaRapportino>(chiaveBozza(interventoId))) ?? null
}

export async function salvaBozza(bozza: BozzaRapportino): Promise<void> {
  await set(chiaveBozza(bozza.interventoId), { ...bozza, aggiornataIl: Date.now() })
}

export async function eliminaBozza(interventoId: string): Promise<void> {
  await del(chiaveBozza(interventoId))
}

export async function leggiCoda(): Promise<BozzaRapportino[]> {
  return (await get<BozzaRapportino[]>(CHIAVE_CODA)) ?? []
}

export async function accodaInvio(bozza: BozzaRapportino): Promise<void> {
  const coda = await leggiCoda()
  const senzaDuplicato = coda.filter((b) => b.interventoId !== bozza.interventoId)
  senzaDuplicato.push({ ...bozza, aggiornataIl: Date.now() })
  await set(CHIAVE_CODA, senzaDuplicato)
}

export async function svuotaCoda(interventoId: string): Promise<void> {
  const coda = await leggiCoda()
  await set(
    CHIAVE_CODA,
    coda.filter((b) => b.interventoId !== interventoId),
  )
}

export async function elaboraCoda(
  invia: (bozza: BozzaRapportino) => Promise<void>,
): Promise<{ inviati: number; rimasti: number }> {
  const coda = await leggiCoda()
  const rimaste: BozzaRapportino[] = []
  let inviati = 0

  for (const bozza of coda) {
    try {
      await invia(bozza)
      inviati += 1
      await eliminaBozza(bozza.interventoId)
    } catch {
      rimaste.push(bozza)
    }
  }

  await set(CHIAVE_CODA, rimaste)
  return { inviati, rimasti: rimaste.length }
}

export function minutiTimer(avviatoIl: number | null, adesso: number = Date.now()): number {
  if (!avviatoIl) return 0
  return Math.floor((adesso - avviatoIl) / 60_000)
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run lib/bozza.test.ts`
Expected: PASS, 12 test.

- [ ] **Step 5: Commit**

```bash
git add lib/bozza.ts lib/bozza.test.ts
git commit -m "feat: add offline draft storage and retry queue for field reports"
```

---

### Task 8: Chiusura del rapportino, idempotente

**Files:**
- Create: `app/(tecnico)/rapportino/azioni.ts`
- Create: `supabase/migrations/0003_chiudi_rapportino.sql`
- Test: `tests/chiusura.test.ts`

**Interfaces:**
- Consumes: lo schema di Task 2, le policy di Task 3, `BozzaRapportino` da `lib/bozza.ts`.
- Produces:
  - la funzione SQL `chiudi_rapportino(p_intervento_id uuid, p_note text, p_firmatario text, p_firma_url text, p_ore jsonb, p_materiali jsonb) returns uuid`
  - la server action `chiudiRapportino(bozza: BozzaRapportino): Promise<{ rapportinoId: string }>` da `app/(tecnico)/rapportino/azioni.ts`
  - la server action `caricaFirma(interventoId: string, dataUrl: string): Promise<string>` che restituisce il percorso su Storage

- [ ] **Step 1: Creare il bucket delle firme e la funzione di chiusura**

Creare `supabase/migrations/0003_chiudi_rapportino.sql`:

```sql
insert into storage.buckets (id, name, public)
values ('firme', 'firme', false)
on conflict (id) do nothing;

create policy firme_lettura on storage.objects for select
  using (bucket_id = 'firme' and auth.uid() is not null);
create policy firme_scrittura on storage.objects for insert
  with check (bucket_id = 'firme' and auth.uid() is not null);

-- Una sola transazione: crea o aggiorna il rapportino, riscrive le righe,
-- chiude l intervento. Il secondo invio della stessa bozza aggiorna
-- invece di duplicare, grazie al vincolo unique su intervento_id.
-- security definer, non invoker: la funzione deve leggere
-- utenti.tariffa_costo_oraria, che ai tecnici e all ufficio è revocata. Per
-- questo verifica da sé chi sta chiudendo, invece di fidarsi delle policy.
create or replace function chiudi_rapportino(
  p_intervento_id uuid,
  p_note text,
  p_firmatario text,
  p_firma_url text,
  p_ore jsonb,
  p_materiali jsonb,
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
  v_tariffe impostazioni;
  v_costo numeric(10,2);
begin
  select tecnico_id into v_tecnico_assegnato from interventi where id = p_intervento_id;
  if v_tecnico_assegnato is null and ruolo_corrente() is distinct from 'ufficio' then
    -- Nessun tecnico assegnato: solo l ufficio può chiudere al posto suo.
    if ruolo_corrente() is distinct from 'titolare' then
      raise exception 'Intervento non assegnato' using errcode = '42501';
    end if;
  end if;
  if v_tecnico_assegnato is distinct from auth.uid()
     and coalesce(ruolo_corrente()::text, '') not in ('ufficio', 'titolare') then
    raise exception 'Intervento di un altro tecnico' using errcode = '42501';
  end if;

  -- Il vincolo unique protegge dal doppione, non dal sorpasso: una bozza
  -- rimasta in coda per giorni non deve sovrascrivere le correzioni fatte in
  -- ufficio nel frattempo.
  select id, aggiornato_il into v_rapportino_id, v_aggiornato_il
  from rapportini where intervento_id = p_intervento_id;

  if v_rapportino_id is not null
     and p_bozza_aggiornata_il is not null
     and v_aggiornato_il > p_bozza_aggiornata_il then
    raise exception 'Rapportino già modificato in ufficio il %', v_aggiornato_il
      using errcode = '40001';
  end if;

  select * into v_tariffe from impostazioni where id;
  select tariffa_costo_oraria into v_costo from utenti where id = auth.uid();
  v_costo := coalesce(v_costo, 0);

  insert into rapportini (intervento_id, tecnico_id, note, firmatario, firma_url)
  values (p_intervento_id, auth.uid(), p_note, nullif(p_firmatario, ''), nullif(p_firma_url, ''))
  on conflict (intervento_id) do update
    set note = excluded.note,
        firmatario = excluded.firmatario,
        firma_url = coalesce(excluded.firma_url, rapportini.firma_url),
        chiuso_il = now()
  returning id into v_rapportino_id;

  delete from rapportino_ore where rapportino_id = v_rapportino_id;
  delete from rapportino_materiali where rapportino_id = v_rapportino_id;

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

revoke all on function chiudi_rapportino(uuid, text, text, text, jsonb, jsonb, timestamptz) from public;
grant execute on function chiudi_rapportino(uuid, text, text, text, jsonb, jsonb, timestamptz) to authenticated;
```

Nota sul prezzo: le tariffe orarie e i prezzi dei materiali si leggono dal database al momento della chiusura, non dalla bozza del telefono. Così un telefono con listino vecchio in cache non riporta prezzi sbagliati, e le righe restano comunque congelate dopo l'inserimento.

- [ ] **Step 2: Scrivere il test di chiusura**

Creare `tests/chiusura.test.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, service, { auth: { persistSession: false } })

let tecnico: ReturnType<typeof createClient>
let interventoId: string

beforeAll(async () => {
  const { data: creato } = await admin.auth.admin.createUser({
    email: `chiusura-${Date.now()}@prova.test`,
    password: 'prova-1234',
    email_confirm: true,
  })
  const tecnicoId = creato!.user!.id
  await admin
    .from('utenti')
    .upsert({ id: tecnicoId, nome: 'Tecnico chiusura', ruolo: 'tecnico', tariffa_costo_oraria: 22 })

  const { data: cliente } = await admin
    .from('clienti')
    .insert({ ragione_sociale: 'Chiusura Srl' })
    .select('id')
    .single()
  const { data: sede } = await admin
    .from('sedi')
    .insert({ cliente_id: cliente!.id, indirizzo: 'Via Chiusura 1' })
    .select('id')
    .single()
  const { data: intervento } = await admin
    .from('interventi')
    .insert({
      sede_id: sede!.id,
      tecnico_id: tecnicoId,
      data: '2026-09-12',
      descrizione: 'Sostituzione valvola',
    })
    .select('id')
    .single()
  interventoId = intervento!.id

  tecnico = createClient(url, anon, { auth: { persistSession: false } })
  await tecnico.auth.signInWithPassword({
    email: creato!.user!.email!,
    password: 'prova-1234',
  })
}, 30_000)

const ore = [
  { tipo: 'viaggio', minuti: 30 },
  { tipo: 'ordinario', minuti: 90 },
]

async function chiudi(note: string) {
  const { data: materiale } = await admin
    .from('materiali')
    .select('id')
    .eq('codice', 'VAL-SFE-12')
    .single()

  return tecnico.rpc('chiudi_rapportino', {
    p_intervento_id: interventoId,
    p_note: note,
    p_firmatario: 'Sig. Rossi',
    p_firma_url: null,
    p_ore: ore,
    p_materiali: [{ materiale_id: materiale!.id, quantita: 2 }],
  })
}

describe('chiudi_rapportino', () => {
  it('crea il rapportino, le righe e chiude l intervento', async () => {
    const { data, error } = await chiudi('Prima chiusura')
    expect(error).toBeNull()
    expect(data).toBeTruthy()

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('tipo,minuti,prezzo_orario,costo_orario')
      .eq('rapportino_id', data as string)
      .order('minuti')

    expect(righeOre).toHaveLength(2)
    expect(righeOre!.find((r) => r.tipo === 'viaggio')!.prezzo_orario).toBe(30)
    expect(righeOre!.find((r) => r.tipo === 'ordinario')!.prezzo_orario).toBe(40)
    expect(righeOre!.every((r) => Number(r.costo_orario) === 22)).toBe(true)

    const { data: intervento } = await admin
      .from('interventi')
      .select('stato')
      .eq('id', interventoId)
      .single()
    expect(intervento!.stato).toBe('chiuso')
  })

  it('il secondo invio aggiorna invece di duplicare', async () => {
    const primo = await chiudi('Prima chiusura')
    const secondo = await chiudi('Seconda chiusura')

    expect(secondo.data).toBe(primo.data)

    const { count } = await admin
      .from('rapportini')
      .select('id', { count: 'exact', head: true })
      .eq('intervento_id', interventoId)
    expect(count).toBe(1)

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('id')
      .eq('rapportino_id', secondo.data as string)
    expect(righeOre).toHaveLength(2)

    const { data: rapportino } = await admin
      .from('rapportini')
      .select('note')
      .eq('intervento_id', interventoId)
      .single()
    expect(rapportino!.note).toBe('Seconda chiusura')
  })

  it('congela il prezzo del materiale al momento della chiusura', async () => {
    const rapportinoId = (await chiudi('Congelamento')).data as string

    const { data: prima } = await admin
      .from('rapportino_materiali')
      .select('prezzo_vendita')
      .eq('rapportino_id', rapportinoId)
      .single()

    await admin.from('materiali').update({ prezzo_vendita: 999 }).eq('codice', 'VAL-SFE-12')

    const { data: dopo } = await admin
      .from('rapportino_materiali')
      .select('prezzo_vendita')
      .eq('rapportino_id', rapportinoId)
      .single()

    expect(Number(dopo!.prezzo_vendita)).toBe(Number(prima!.prezzo_vendita))
    expect(Number(dopo!.prezzo_vendita)).not.toBe(999)

    await admin.from('materiali').update({ prezzo_vendita: 11 }).eq('codice', 'VAL-SFE-12')
  })

  it('rifiuta una bozza più vecchia dell ultima modifica in ufficio', async () => {
    await chiudi('Chiusura del tecnico')

    // L ufficio corregge il rapportino dopo la chiusura.
    await admin
      .from('rapportini')
      .update({ note: 'Corretto in ufficio' })
      .eq('intervento_id', interventoId)

    const { data: materiale } = await admin
      .from('materiali')
      .select('id')
      .eq('codice', 'VAL-SFE-12')
      .single()

    const bozzaVecchia = await tecnico.rpc('chiudi_rapportino', {
      p_intervento_id: interventoId,
      p_note: 'Reinvio di una bozza vecchia',
      p_firmatario: 'Sig. Rossi',
      p_firma_url: null,
      p_ore: ore,
      p_materiali: [{ materiale_id: materiale!.id, quantita: 2 }],
      p_bozza_aggiornata_il: new Date(Date.now() - 86_400_000).toISOString(),
    })

    expect(bozzaVecchia.error).not.toBeNull()

    const { data: rapportino } = await admin
      .from('rapportini')
      .select('note')
      .eq('intervento_id', interventoId)
      .single()
    expect(rapportino!.note).toBe('Corretto in ufficio')
  })

  it('scarta le righe con minuti o quantita a zero', async () => {
    const { data } = await tecnico.rpc('chiudi_rapportino', {
      p_intervento_id: interventoId,
      p_note: 'Righe vuote',
      p_firmatario: '',
      p_firma_url: null,
      p_ore: [{ tipo: 'viaggio', minuti: 0 }, { tipo: 'ordinario', minuti: 45 }],
      p_materiali: [{ materiale_id: null, descrizione: 'Sigillante', quantita: 0, prezzo_vendita: 5 }],
      p_bozza_aggiornata_il: null,
    })

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('minuti')
      .eq('rapportino_id', data as string)
    expect(righeOre).toHaveLength(1)
    expect(righeOre![0].minuti).toBe(45)

    const { data: righeMat } = await admin
      .from('rapportino_materiali')
      .select('id')
      .eq('rapportino_id', data as string)
    expect(righeMat).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Verificare che il test fallisca**

Run: `npm run db:reset && npx vitest run tests/chiusura.test.ts`
Expected: FAIL — `Could not find the function public.chiudi_rapportino`.

- [ ] **Step 4: Applicare la migrazione**

Run: `npm run db:reset`
Expected: le tre migrazioni applicate.

- [ ] **Step 5: Verificare che il test passi**

Run: `npx vitest run tests/chiusura.test.ts`
Expected: PASS, 5 test.

- [ ] **Step 6: Scrivere le server action**

Creare `app/(tecnico)/rapportino/azioni.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'
import type { BozzaRapportino } from '@/lib/bozza'

export async function caricaFirma(interventoId: string, dataUrl: string): Promise<string> {
  const supabase = await clientServer()
  const base64 = dataUrl.split(',')[1] ?? ''
  const binario = Buffer.from(base64, 'base64')
  const percorso = `${interventoId}/${Date.now()}.png`

  const { error } = await supabase.storage
    .from('firme')
    .upload(percorso, binario, { contentType: 'image/png', upsert: true })
  if (error) throw new Error(`Firma non caricata: ${error.message}`)

  return percorso
}

export async function chiudiRapportino(bozza: BozzaRapportino) {
  const supabase = await clientServer()

  let firmaUrl: string | null = null
  if (bozza.firmaDataUrl) firmaUrl = await caricaFirma(bozza.interventoId, bozza.firmaDataUrl)

  const { data, error } = await supabase.rpc('chiudi_rapportino', {
    p_intervento_id: bozza.interventoId,
    p_note: bozza.note,
    p_firmatario: bozza.firmatario,
    p_firma_url: firmaUrl,
    p_ore: bozza.ore.map(({ tipo, minuti }) => ({ tipo, minuti })),
    p_materiali: bozza.materiali.map(({ materiale_id, descrizione, quantita, prezzo_vendita }) => ({
      materiale_id,
      descrizione,
      quantita,
      prezzo_vendita,
    })),
    p_bozza_aggiornata_il: new Date(bozza.aggiornataIl).toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/oggi')
  revalidatePath('/rapportini')
  return { rapportinoId: data as string }
}
```

- [ ] **Step 7: Rigenerare i tipi con la nuova funzione**

```bash
npx supabase gen types typescript --local > lib/supabase/database.ts
npx tsc --noEmit
```

Expected: nessun errore di tipo; `chiudi_rapportino` compare tra le `Functions`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0003_chiudi_rapportino.sql tests/chiusura.test.ts app lib/supabase/database.ts
git commit -m "feat(rapportini): close field reports idempotently with server-side pricing"
```

---

### Task 9: Vista mobile del tecnico — lista di oggi

**Files:**
- Create: `app/(tecnico)/oggi/page.tsx`
- Create: `components/tecnico/CardIntervento.tsx`
- Create: `components/tecnico/StatoCoda.tsx`
- Test: `components/tecnico/CardIntervento.test.tsx`

**Interfaces:**
- Consumes: `richiediRuolo` da `lib/sessione.ts`, `clientServer` da `lib/supabase/server.ts`, `elaboraCoda` e `leggiCoda` da `lib/bozza.ts`, `chiudiRapportino` da `app/(tecnico)/rapportino/azioni.ts`.
- Produces:
  - `<CardIntervento intervento={InterventoDelGiorno} />` da `components/tecnico/CardIntervento.tsx`
  - `type InterventoDelGiorno = { id: string; ora_inizio: string | null; descrizione: string; priorita: Priorita; stato: StatoIntervento; cliente: string; indirizzo: string; comune: string | null; haRapportino: boolean }`
  - `<StatoCoda />` da `components/tecnico/StatoCoda.tsx`

- [ ] **Step 1: Scrivere il test del componente**

Creare `components/tecnico/CardIntervento.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardIntervento, type InterventoDelGiorno } from './CardIntervento'

const base: InterventoDelGiorno = {
  id: 'int-1',
  ora_inizio: '09:30:00',
  descrizione: 'Sostituzione valvola termostatica',
  priorita: 'normale',
  stato: 'programmato',
  cliente: 'Panificio Rossi S.r.l.',
  indirizzo: 'Via Industriale 8',
  comune: 'Brescia',
  haRapportino: false,
}

describe('CardIntervento', () => {
  it('mostra ora, cliente, indirizzo e descrizione', () => {
    render(<CardIntervento intervento={base} />)
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('Panificio Rossi S.r.l.')).toBeInTheDocument()
    expect(screen.getByText(/Via Industriale 8/)).toBeInTheDocument()
    expect(screen.getByText(/Sostituzione valvola/)).toBeInTheDocument()
  })

  it('evidenzia le urgenze', () => {
    render(<CardIntervento intervento={{ ...base, priorita: 'urgente' }} />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('invita ad aprire il rapportino quando non esiste', () => {
    render(<CardIntervento intervento={base} />)
    expect(screen.getByRole('link', { name: /Apri rapportino/i })).toHaveAttribute(
      'href',
      '/rapportino/int-1',
    )
  })

  it('segnala il rapportino gia chiuso e non invita a riaprirlo', () => {
    render(<CardIntervento intervento={{ ...base, stato: 'chiuso', haRapportino: true }} />)
    expect(screen.getByText('Chiuso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rivedi/i })).toBeInTheDocument()
  })

  it('mostra un segnaposto se manca l ora di inizio', () => {
    render(<CardIntervento intervento={{ ...base, ora_inizio: null }} />)
    expect(screen.getByText('Orario libero')).toBeInTheDocument()
  })

  it('apre la navigazione verso l indirizzo con un solo tocco', () => {
    render(<CardIntervento intervento={base} />)
    const naviga = screen.getByRole('link', { name: /Naviga/i })
    expect(naviga).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('Via Industriale 8')),
    )
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run components/tecnico/CardIntervento.test.tsx`
Expected: FAIL — `Failed to resolve import "./CardIntervento"`.

- [ ] **Step 3: Implementare la card**

Creare `components/tecnico/CardIntervento.tsx`:

```tsx
import Link from 'next/link'
import { MapPin, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Priorita, StatoIntervento } from '@/lib/supabase/tipi'

export type InterventoDelGiorno = {
  id: string
  ora_inizio: string | null
  descrizione: string
  priorita: Priorita
  stato: StatoIntervento
  cliente: string
  indirizzo: string
  comune: string | null
  haRapportino: boolean
}

const etichettaPriorita: Record<Priorita, string> = {
  bassa: 'Bassa',
  normale: 'Normale',
  urgente: 'Urgente',
}

export function CardIntervento({ intervento }: { intervento: InterventoDelGiorno }) {
  const chiuso = intervento.stato === 'chiuso'
  const indirizzoCompleto = [intervento.indirizzo, intervento.comune].filter(Boolean).join(', ')
  const urlMappe = `https://maps.apple.com/?q=${encodeURIComponent(indirizzoCompleto)}`

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm',
        intervento.priorita === 'urgente' && !chiuso && 'border-red-300 bg-red-50',
        chiuso && 'opacity-70',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-semibold tabular-nums">
          {intervento.ora_inizio ? intervento.ora_inizio.slice(0, 5) : 'Orario libero'}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            chiuso ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800',
            intervento.priorita === 'urgente' && !chiuso && 'bg-red-600 text-white',
          )}
        >
          {chiuso ? 'Chiuso' : etichettaPriorita[intervento.priorita]}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-medium">{intervento.cliente}</h2>

      <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {indirizzoCompleto}
      </p>

      <p className="mt-3 text-base">{intervento.descrizione}</p>

      <div className="mt-4 flex gap-3">
        <Link
          href={`/rapportino/${intervento.id}`}
          className="flex h-14 flex-1 items-center justify-center rounded-xl bg-blue-600 text-base font-medium text-white"
        >
          {intervento.haRapportino ? 'Rivedi rapportino' : 'Apri rapportino'}
        </Link>
        <Link
          href={urlMappe}
          aria-label="Naviga"
          className="flex size-14 items-center justify-center rounded-xl border border-slate-300"
        >
          <Navigation className="size-5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run components/tecnico/CardIntervento.test.tsx`
Expected: PASS, 6 test.

- [ ] **Step 5: Implementare l'indicatore della coda**

Creare `components/tecnico/StatoCoda.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { elaboraCoda, leggiCoda } from '@/lib/bozza'
import { chiudiRapportino } from '@/app/(tecnico)/rapportino/azioni'

export function StatoCoda() {
  const [inAttesa, setInAttesa] = useState(0)
  const [inInvio, setInInvio] = useState(false)

  const aggiorna = useCallback(async () => {
    setInAttesa((await leggiCoda()).length)
  }, [])

  const svuota = useCallback(async () => {
    setInInvio(true)
    try {
      await elaboraCoda(async (bozza) => {
        await chiudiRapportino(bozza)
      })
    } finally {
      setInInvio(false)
      await aggiorna()
    }
  }, [aggiorna])

  useEffect(() => {
    void aggiorna()
    const alRitornoRete = () => void svuota()
    window.addEventListener('online', alRitornoRete)
    if (navigator.onLine) void svuota()
    return () => window.removeEventListener('online', alRitornoRete)
  }, [aggiorna, svuota])

  if (inAttesa === 0) return null

  return (
    <button
      type="button"
      onClick={() => void svuota()}
      disabled={inInvio}
      className="flex w-full items-center gap-3 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm text-amber-900"
    >
      {inInvio ? (
        <RefreshCw className="size-5 animate-spin" aria-hidden />
      ) : (
        <CloudOff className="size-5" aria-hidden />
      )}
      {inAttesa === 1
        ? '1 rapportino in attesa di invio. Tocca per riprovare.'
        : `${inAttesa} rapportini in attesa di invio. Tocca per riprovare.`}
    </button>
  )
}
```

- [ ] **Step 6: Implementare la pagina di oggi**

Creare `app/(tecnico)/oggi/page.tsx`:

```tsx
import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { CardIntervento, type InterventoDelGiorno } from '@/components/tecnico/CardIntervento'
import { StatoCoda } from '@/components/tecnico/StatoCoda'

export default async function Oggi() {
  const utente = await richiediRuolo(['tecnico'])
  const supabase = await clientServer()
  const oggi = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('interventi')
    .select(
      `id, ora_inizio, descrizione, priorita, stato,
       sedi ( indirizzo, comune, clienti ( ragione_sociale ) ),
       rapportini ( id )`,
    )
    .eq('tecnico_id', utente.id)
    .eq('data', oggi)
    .neq('stato', 'annullato')
    .order('ora_inizio', { ascending: true, nullsFirst: false })

  const interventi: InterventoDelGiorno[] = (data ?? []).map((riga) => ({
    id: riga.id,
    ora_inizio: riga.ora_inizio,
    descrizione: riga.descrizione,
    priorita: riga.priorita,
    stato: riga.stato,
    cliente: riga.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato',
    indirizzo: riga.sedi?.indirizzo ?? '',
    comune: riga.sedi?.comune ?? null,
    haRapportino: (riga.rapportini ?? []).length > 0,
  }))

  return (
    <main className="flex flex-col gap-4 p-4">
      <StatoCoda />
      <h1 className="text-2xl font-semibold">Oggi</h1>
      {interventi.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-slate-500">
          Nessun intervento assegnato per oggi.
        </p>
      ) : (
        interventi.map((intervento) => (
          <CardIntervento key={intervento.id} intervento={intervento} />
        ))
      )}
    </main>
  )
}
```

- [ ] **Step 7: Verificare a mano sul telefono simulato**

Run: `npm run dev`, accedere come tecnico, aprire `http://localhost:3000/oggi` con il device toolbar su 390 px di larghezza.
Expected: le card riempiono la larghezza, i pulsanti sono alti almeno 56 px, nessuno scorrimento orizzontale.

Se la lista è vuota, assegnare interventi al tecnico di prova:

```bash
npx supabase db execute --sql "
  update interventi set tecnico_id = (select id from utenti where ruolo = 'tecnico' limit 1),
    data = current_date;
"
```

- [ ] **Step 8: Commit**

```bash
git add app/\(tecnico\) components/tecnico
git commit -m "feat(tecnico): add today list with queue indicator and large touch targets"
```

---

### Task 10: Rapportino mobile a passi

**Files:**
- Create: `app/(tecnico)/rapportino/[interventoId]/page.tsx`
- Create: `components/tecnico/FormRapportino.tsx`
- Create: `components/tecnico/PassoOre.tsx`
- Create: `components/tecnico/PassoMateriali.tsx`
- Create: `components/tecnico/PassoFirma.tsx`
- Create: `components/tecnico/TelaFirma.tsx`
- Test: `components/tecnico/PassoOre.test.tsx`, `components/tecnico/PassoMateriali.test.tsx`

**Interfaces:**
- Consumes: `BozzaRapportino`, `bozzaVuota`, `leggiBozza`, `salvaBozza`, `accodaInvio`, `eliminaBozza`, `minutiTimer` da `lib/bozza.ts`; `calcolaTotali`, `formattaEuro`, `formattaOre` da `lib/calcoli.ts`; `chiudiRapportino` da `app/(tecnico)/rapportino/azioni.ts`.
- Produces:
  - `<PassoOre ore={RigaOreBozza[]} timerAvviatoIl={number|null} onCambio={(ore) => void} onTimer={(avvio: number|null) => void} tariffe={Tariffe} />`
  - `type Tariffe = { viaggio: number; ordinario: number; urgenza: number }`
  - `<PassoMateriali listino={MaterialeListino[]} righe={RigaMaterialeBozza[]} onCambio={(righe) => void} />`
  - `type MaterialeListino = { id: string; codice: string; descrizione: string; unita: string; prezzo_vendita: number }`
  - `<TelaFirma valore={string|null} onCambio={(dataUrl: string|null) => void} />`
  - `<FormRapportino intervento={...} listino={MaterialeListino[]} tariffe={Tariffe} />`

- [ ] **Step 1: Scrivere il test del passo ore**

Creare `components/tecnico/PassoOre.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PassoOre } from './PassoOre'

const tariffe = { viaggio: 30, ordinario: 40, urgenza: 60 }

describe('PassoOre', () => {
  it('mostra una riga per ogni tipo di ora', () => {
    render(<PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={vi.fn()} onTimer={vi.fn()} />)
    expect(screen.getByText('Viaggio')).toBeInTheDocument()
    expect(screen.getByText('Ordinario')).toBeInTheDocument()
    expect(screen.getByText('Urgenza')).toBeInTheDocument()
  })

  it('aggiunge quindici minuti al tocco del piu', async () => {
    const onCambio = vi.fn()
    render(<PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={onCambio} onTimer={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi 15 minuti a ordinario' }))

    expect(onCambio).toHaveBeenCalledWith([
      { tipo: 'ordinario', minuti: 15, prezzo_orario: 40 },
    ])
  })

  it('non scende sotto zero minuti', async () => {
    const onCambio = vi.fn()
    render(
      <PassoOre
        ore={[{ tipo: 'ordinario', minuti: 15, prezzo_orario: 40 }]}
        timerAvviatoIl={null}
        tariffe={tariffe}
        onCambio={onCambio}
        onTimer={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Togli 15 minuti a ordinario' }))
    expect(onCambio).toHaveBeenCalledWith([])
  })

  it('avvia il timer e comunica il timestamp di avvio', async () => {
    const onTimer = vi.fn()
    render(<PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={vi.fn()} onTimer={onTimer} />)

    await userEvent.click(screen.getByRole('button', { name: /Avvia timer/i }))
    expect(onTimer).toHaveBeenCalledWith(expect.any(Number))
  })

  it('a timer avviato mostra i minuti trascorsi e propone di fermarlo', () => {
    const avvio = Date.now() - 25 * 60_000
    render(
      <PassoOre ore={[]} timerAvviatoIl={avvio} tariffe={tariffe} onCambio={vi.fn()} onTimer={vi.fn()} />,
    )
    expect(screen.getByText('25 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ferma timer/i })).toBeInTheDocument()
  })

  it('fermando il timer somma i minuti alle ore ordinarie', async () => {
    const avvio = Date.now() - 40 * 60_000
    const onCambio = vi.fn()
    const onTimer = vi.fn()
    render(
      <PassoOre
        ore={[{ tipo: 'ordinario', minuti: 20, prezzo_orario: 40 }]}
        timerAvviatoIl={avvio}
        tariffe={tariffe}
        onCambio={onCambio}
        onTimer={onTimer}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Ferma timer/i }))

    expect(onCambio).toHaveBeenCalledWith([{ tipo: 'ordinario', minuti: 60, prezzo_orario: 40 }])
    expect(onTimer).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npm install -D @testing-library/user-event && npx vitest run components/tecnico/PassoOre.test.tsx`
Expected: FAIL — `Failed to resolve import "./PassoOre"`.

- [ ] **Step 3: Implementare il passo ore**

Creare `components/tecnico/PassoOre.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Minus, Play, Plus, Square } from 'lucide-react'
import { formattaOre, formattaEuro } from '@/lib/calcoli'
import { minutiTimer, type RigaOreBozza } from '@/lib/bozza'
import type { TipoOra } from '@/lib/supabase/tipi'

export type Tariffe = { viaggio: number; ordinario: number; urgenza: number }

const tipi: { tipo: TipoOra; etichetta: string }[] = [
  { tipo: 'viaggio', etichetta: 'Viaggio' },
  { tipo: 'ordinario', etichetta: 'Ordinario' },
  { tipo: 'urgenza', etichetta: 'Urgenza' },
]

const PASSO_MINUTI = 15

export function PassoOre({
  ore,
  timerAvviatoIl,
  tariffe,
  onCambio,
  onTimer,
}: {
  ore: RigaOreBozza[]
  timerAvviatoIl: number | null
  tariffe: Tariffe
  onCambio: (ore: RigaOreBozza[]) => void
  onTimer: (avviatoIl: number | null) => void
}) {
  const [adesso, setAdesso] = useState(() => Date.now())

  useEffect(() => {
    if (!timerAvviatoIl) return
    const id = setInterval(() => setAdesso(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [timerAvviatoIl])

  const minuti = (tipo: TipoOra) => ore.find((r) => r.tipo === tipo)?.minuti ?? 0

  function cambia(tipo: TipoOra, delta: number) {
    const nuovi = Math.max(0, minuti(tipo) + delta)
    const altre = ore.filter((r) => r.tipo !== tipo)
    onCambio(
      nuovi === 0
        ? altre
        : [...altre, { tipo, minuti: nuovi, prezzo_orario: tariffe[tipo] }].sort((a, b) =>
            a.tipo.localeCompare(b.tipo),
          ),
    )
  }

  const trascorsi = minutiTimer(timerAvviatoIl, adesso)

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Timer di lavoro</span>
          <span className="text-2xl font-semibold tabular-nums">{formattaOre(trascorsi)}</span>
        </div>
        {timerAvviatoIl ? (
          <button
            type="button"
            onClick={() => {
              cambia('ordinario', trascorsi)
              onTimer(null)
            }}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-medium text-white"
          >
            <Square className="size-5" aria-hidden /> Ferma timer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTimer(Date.now())}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-base font-medium text-white"
          >
            <Play className="size-5" aria-hidden /> Avvia timer
          </button>
        )}
      </div>

      {tipi.map(({ tipo, etichetta }) => (
        <div key={tipo} className="rounded-2xl border bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium">{etichetta}</span>
            <span className="text-xs text-slate-500">{formattaEuro(tariffe[tipo])} / h</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              aria-label={`Togli ${PASSO_MINUTI} minuti a ${tipo}`}
              onClick={() => cambia(tipo, -PASSO_MINUTI)}
              className="flex size-14 items-center justify-center rounded-xl border border-slate-300"
            >
              <Minus className="size-5" aria-hidden />
            </button>
            <span className="flex-1 text-center text-xl font-semibold tabular-nums">
              {formattaOre(minuti(tipo))}
            </span>
            <button
              type="button"
              aria-label={`Aggiungi ${PASSO_MINUTI} minuti a ${tipo}`}
              onClick={() => cambia(tipo, PASSO_MINUTI)}
              className="flex size-14 items-center justify-center rounded-xl bg-blue-600 text-white"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Verificare che i test del passo ore passino**

Run: `npx vitest run components/tecnico/PassoOre.test.tsx`
Expected: PASS, 6 test.

- [ ] **Step 5: Scrivere il test del passo materiali**

Creare `components/tecnico/PassoMateriali.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PassoMateriali, type MaterialeListino } from './PassoMateriali'

const listino: MaterialeListino[] = [
  { id: 'm1', codice: 'VAL-SFE-12', descrizione: 'Valvola a sfera 1/2', unita: 'pz', prezzo_vendita: 11 },
  { id: 'm2', codice: 'TUB-CU-15', descrizione: 'Tubo rame ricotto 15 mm', unita: 'm', prezzo_vendita: 7.5 },
  { id: 'm3', codice: 'GUA-CAN-12', descrizione: 'Guarnizione canapa 1/2', unita: 'pz', prezzo_vendita: 0.9 },
]

describe('PassoMateriali', () => {
  it('filtra il listino per descrizione', async () => {
    render(<PassoMateriali listino={listino} righe={[]} onCambio={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'rame')

    expect(screen.getByText('Tubo rame ricotto 15 mm')).toBeInTheDocument()
    expect(screen.queryByText('Valvola a sfera 1/2')).not.toBeInTheDocument()
  })

  it('filtra anche per codice', async () => {
    render(<PassoMateriali listino={listino} righe={[]} onCambio={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'gua-can')
    expect(screen.getByText('Guarnizione canapa 1/2')).toBeInTheDocument()
  })

  it('aggiunge il materiale con quantita uno al primo tocco', async () => {
    const onCambio = vi.fn()
    render(<PassoMateriali listino={listino} righe={[]} onCambio={onCambio} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'sfera')
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi Valvola a sfera/i }))

    expect(onCambio).toHaveBeenCalledWith([
      {
        materiale_id: 'm1',
        descrizione: 'Valvola a sfera 1/2',
        quantita: 1,
        prezzo_vendita: 11,
      },
    ])
  })

  it('incrementa la quantita di una riga gia presente', async () => {
    const onCambio = vi.fn()
    render(
      <PassoMateriali
        listino={listino}
        righe={[{ materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 2, prezzo_vendita: 11 }]}
        onCambio={onCambio}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Aumenta Valvola a sfera/i }))
    expect(onCambio).toHaveBeenCalledWith([
      { materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 3, prezzo_vendita: 11 },
    ])
  })

  it('rimuove la riga quando la quantita scende a zero', async () => {
    const onCambio = vi.fn()
    render(
      <PassoMateriali
        listino={listino}
        righe={[{ materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 1, prezzo_vendita: 11 }]}
        onCambio={onCambio}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Riduci Valvola a sfera/i }))
    expect(onCambio).toHaveBeenCalledWith([])
  })

  it('mostra il totale dei materiali scelti', () => {
    render(
      <PassoMateriali
        listino={listino}
        righe={[
          { materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 2, prezzo_vendita: 11 },
          { materiale_id: 'm2', descrizione: 'Tubo rame ricotto 15 mm', quantita: 3, prezzo_vendita: 7.5 },
        ]}
        onCambio={vi.fn()}
      />,
    )
    expect(screen.getByText('44,50 €')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Verificare che i test falliscano**

Run: `npx vitest run components/tecnico/PassoMateriali.test.tsx`
Expected: FAIL — `Failed to resolve import "./PassoMateriali"`.

- [ ] **Step 7: Implementare il passo materiali**

Creare `components/tecnico/PassoMateriali.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formattaEuro } from '@/lib/calcoli'
import type { RigaMaterialeBozza } from '@/lib/bozza'

export type MaterialeListino = {
  id: string
  codice: string
  descrizione: string
  unita: string
  prezzo_vendita: number
}

export function PassoMateriali({
  listino,
  righe,
  onCambio,
}: {
  listino: MaterialeListino[]
  righe: RigaMaterialeBozza[]
  onCambio: (righe: RigaMaterialeBozza[]) => void
}) {
  const [ricerca, setRicerca] = useState('')

  const risultati = useMemo(() => {
    const termine = ricerca.trim().toLowerCase()
    if (termine.length < 2) return []
    return listino
      .filter(
        (m) =>
          m.descrizione.toLowerCase().includes(termine) ||
          m.codice.toLowerCase().includes(termine),
      )
      .slice(0, 20)
  }, [listino, ricerca])

  function cambiaQuantita(materiale: MaterialeListino, delta: number) {
    const esistente = righe.find((r) => r.materiale_id === materiale.id)
    const quantita = (esistente?.quantita ?? 0) + delta
    const altre = righe.filter((r) => r.materiale_id !== materiale.id)

    if (quantita <= 0) return onCambio(altre)

    onCambio([
      ...altre,
      {
        materiale_id: materiale.id,
        descrizione: materiale.descrizione,
        quantita,
        prezzo_vendita: materiale.prezzo_vendita,
      },
    ])
  }

  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzo_vendita, 0)

  return (
    <section className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Cerca materiale
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Codice o descrizione"
          className="h-14 rounded-xl border px-4 text-base"
        />
      </label>

      {risultati.length > 0 && (
        <ul className="flex flex-col gap-2">
          {risultati.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                aria-label={`Aggiungi ${m.descrizione}`}
                onClick={() => cambiaQuantita(m, 1)}
                className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left"
              >
                <span>
                  <span className="block text-base">{m.descrizione}</span>
                  <span className="block text-xs text-slate-500">
                    {m.codice} · {formattaEuro(m.prezzo_vendita)} / {m.unita}
                  </span>
                </span>
                <Plus className="size-5 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border bg-white">
        <h3 className="border-b px-4 py-3 text-sm font-medium text-slate-600">Materiali usati</h3>
        {righe.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nessun materiale.</p>
        ) : (
          <ul>
            {righe.map((riga) => {
              const materiale = listino.find((m) => m.id === riga.materiale_id)
              return (
                <li
                  key={riga.materiale_id ?? riga.descrizione}
                  className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="flex-1">
                    <span className="block text-base">{riga.descrizione}</span>
                    <span className="block text-xs text-slate-500">
                      {formattaEuro(riga.quantita * riga.prezzo_vendita)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Riduci ${riga.descrizione}`}
                    onClick={() => materiale && cambiaQuantita(materiale, -1)}
                    className="flex size-12 items-center justify-center rounded-xl border border-slate-300"
                  >
                    <Minus className="size-5" aria-hidden />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold tabular-nums">
                    {riga.quantita}
                  </span>
                  <button
                    type="button"
                    aria-label={`Aumenta ${riga.descrizione}`}
                    onClick={() => materiale && cambiaQuantita(materiale, 1)}
                    className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white"
                  >
                    <Plus className="size-5" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex items-baseline justify-between border-t px-4 py-3">
          <span className="text-sm text-slate-600">Totale materiali</span>
          <span className="text-lg font-semibold">{formattaEuro(totale)}</span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Verificare che i test del passo materiali passino**

Run: `npx vitest run components/tecnico/PassoMateriali.test.tsx`
Expected: PASS, 6 test.

- [ ] **Step 9: Implementare la tela della firma**

Creare `components/tecnico/TelaFirma.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export function TelaFirma({
  valore,
  onCambio,
}: {
  valore: string | null
  onCambio: (dataUrl: string | null) => void
}) {
  const tela = useRef<HTMLCanvasElement>(null)
  const [staDisegnando, setStaDisegnando] = useState(false)

  useEffect(() => {
    const canvas = tela.current
    if (!canvas) return
    const scala = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * scala
    canvas.height = canvas.clientHeight * scala
    const ctx = canvas.getContext('2d')!
    ctx.scale(scala, scala)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    if (valore) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight)
      img.src = valore
    }
    // Il ridisegno iniziale avviene una sola volta per montaggio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function posizione(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={tela}
        className="h-48 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const ctx = e.currentTarget.getContext('2d')!
          const { x, y } = posizione(e)
          ctx.beginPath()
          ctx.moveTo(x, y)
          setStaDisegnando(true)
        }}
        onPointerMove={(e) => {
          if (!staDisegnando) return
          const ctx = e.currentTarget.getContext('2d')!
          const { x, y } = posizione(e)
          ctx.lineTo(x, y)
          ctx.stroke()
        }}
        onPointerUp={(e) => {
          setStaDisegnando(false)
          onCambio(e.currentTarget.toDataURL('image/png'))
        }}
      />
      <button
        type="button"
        onClick={() => {
          const canvas = tela.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
          onCambio(null)
        }}
        className="h-12 rounded-xl border border-slate-300 text-sm"
      >
        Cancella firma
      </button>
    </div>
  )
}
```

- [ ] **Step 10: Implementare il passo firma e il form a passi**

Creare `components/tecnico/PassoFirma.tsx`: campo di testo `firmatario`, `<TelaFirma />`, e un riquadro riassuntivo che mostra `formattaEuro(calcolaTotali(ore, materiali).totale)`.

Creare `components/tecnico/FormRapportino.tsx`:

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  accodaInvio,
  bozzaVuota,
  eliminaBozza,
  leggiBozza,
  salvaBozza,
  type BozzaRapportino,
} from '@/lib/bozza'
import { calcolaTotali, formattaEuro } from '@/lib/calcoli'
import { chiudiRapportino } from '@/app/(tecnico)/rapportino/azioni'
import { PassoOre, type Tariffe } from './PassoOre'
import { PassoMateriali, type MaterialeListino } from './PassoMateriali'
import { PassoFirma } from './PassoFirma'

const passi = ['Ore', 'Materiali', 'Note e firma'] as const

export function FormRapportino({
  interventoId,
  cliente,
  descrizione,
  listino,
  tariffe,
}: {
  interventoId: string
  cliente: string
  descrizione: string
  listino: MaterialeListino[]
  tariffe: Tariffe
}) {
  const router = useRouter()
  const [bozza, setBozza] = useState<BozzaRapportino | null>(null)
  const [passo, setPasso] = useState(0)
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const [inCorso, avvia] = useTransition()

  useEffect(() => {
    void leggiBozza(interventoId).then((salvata) =>
      setBozza(salvata ?? bozzaVuota(interventoId)),
    )
  }, [interventoId])

  function aggiorna(modifica: Partial<BozzaRapportino>) {
    setBozza((precedente) => {
      if (!precedente) return precedente
      const nuova = { ...precedente, ...modifica }
      void salvaBozza(nuova)
      return nuova
    })
  }

  if (!bozza) return <p className="p-4 text-slate-500">Carico la bozza…</p>

  const totali = calcolaTotali(bozza.ore, bozza.materiali)

  function chiudi() {
    avvia(async () => {
      try {
        await chiudiRapportino(bozza)
        await eliminaBozza(interventoId)
        router.push('/oggi')
      } catch (errore) {
        const testo = errore instanceof Error ? errore.message : ''
        if (testo.includes('già modificato in ufficio')) {
          // Rimetterlo in coda lo farebbe rifiutare per sempre: qui serve una persona.
          setMessaggio(
            'L ufficio ha già corretto questo rapportino: la tua copia non è stata inviata. Chiama l ufficio prima di rifarlo.',
          )
          return
        }
        await accodaInvio(bozza)
        setMessaggio('Rete assente: rapportino messo in coda, verrà inviato appena torna il segnale.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">{cliente}</h1>
        <p className="text-sm text-slate-600">{descrizione}</p>
      </header>

      <nav className="flex gap-2" aria-label="Passi del rapportino">
        {passi.map((etichetta, indice) => (
          <button
            key={etichetta}
            type="button"
            onClick={() => setPasso(indice)}
            aria-current={passo === indice}
            className={`h-12 flex-1 rounded-xl text-sm font-medium ${
              passo === indice ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
            }`}
          >
            {etichetta}
          </button>
        ))}
      </nav>

      {passo === 0 && (
        <PassoOre
          ore={bozza.ore}
          timerAvviatoIl={bozza.timerAvviatoIl}
          tariffe={tariffe}
          onCambio={(ore) => aggiorna({ ore })}
          onTimer={(timerAvviatoIl) => aggiorna({ timerAvviatoIl })}
        />
      )}

      {passo === 1 && (
        <PassoMateriali
          listino={listino}
          righe={bozza.materiali}
          onCambio={(materiali) => aggiorna({ materiali })}
        />
      )}

      {passo === 2 && (
        <PassoFirma
          note={bozza.note}
          firmatario={bozza.firmatario}
          firmaDataUrl={bozza.firmaDataUrl}
          totale={totali.totale}
          onCambio={aggiorna}
        />
      )}

      {messaggio && (
        <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">{messaggio}</p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t bg-white px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-600">Totale intervento</span>
          <span className="text-xl font-semibold">{formattaEuro(totali.totale)}</span>
        </div>
        {passo < passi.length - 1 ? (
          <button
            type="button"
            onClick={() => setPasso(passo + 1)}
            className="h-14 w-full rounded-xl bg-slate-900 text-base font-medium text-white"
          >
            Avanti
          </button>
        ) : (
          <button
            type="button"
            onClick={chiudi}
            disabled={inCorso || bozza.ore.length === 0}
            className="h-14 w-full rounded-xl bg-green-600 text-base font-medium text-white disabled:opacity-60"
          >
            {inCorso ? 'Invio…' : 'Chiudi rapportino'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Implementare la pagina del rapportino**

Creare `app/(tecnico)/rapportino/[interventoId]/page.tsx`: `richiediRuolo(['tecnico'])`, legge l'intervento con cliente e sede, legge il listino attivo (`materiali` con `attivo = true`, colonne `id, codice, descrizione, unita, prezzo_vendita`) e le tariffe da `impostazioni`, poi rende `<FormRapportino />` con quei dati. Se l'intervento non esiste o non è del tecnico, `notFound()`.

- [ ] **Step 12: Verificare a mano il ciclo offline**

Run: `npm run dev`, aprire il rapportino, inserire ore e materiali, mettere il browser in modalità offline dal pannello Network, toccare "Chiudi rapportino".
Expected: appare il messaggio di coda; tornando online l'indicatore `StatoCoda` invia il rapportino e la lista di oggi mostra l'intervento chiuso.

- [ ] **Step 13: Commit**

```bash
git add app components
git commit -m "feat(tecnico): add stepped field report with timer, materials, signature and offline queue"
```

---

### Task 11: Planning giornaliero dell'ufficio

**Files:**
- Create: `app/(ufficio)/planning/page.tsx`
- Create: `app/(ufficio)/planning/azioni.ts`
- Create: `components/ufficio/Tabellone.tsx`
- Create: `components/ufficio/CardPlanning.tsx`
- Create: `components/ufficio/DialogIntervento.tsx`
- Create: `lib/planning.ts`
- Test: `lib/planning.test.ts`

**Interfaces:**
- Consumes: `richiediRuolo`, `clientServer`, i tipi da `lib/supabase/tipi.ts`.
- Produces:
  - `fasceOrarie(dalle?: number, alle?: number): string[]` da `lib/planning.ts` — etichette `'07:00'` … `'19:00'`
  - `fasciaDiAppartenenza(oraInizio: string | null): string | null` da `lib/planning.ts`
  - `idCella(tecnicoId: string, fascia: string): string` e `leggiCella(id: string): { tecnicoId: string; fascia: string }` da `lib/planning.ts`
  - `spostaIntervento(interventoId: string, tecnicoId: string, fascia: string, data: string): Promise<void>` da `app/(ufficio)/planning/azioni.ts`
  - `creaIntervento(dati: FormData): Promise<{ errore?: string }>` e `creaClienteRapido(dati: FormData): Promise<{ clienteId: string; sedeId: string }>` da `app/(ufficio)/planning/azioni.ts`
  - `<Tabellone data={string} tecnici={TecnicoColonna[]} interventi={InterventoPlanning[]} />`
  - `type TecnicoColonna = { id: string; nome: string; colore: string }`
  - `type InterventoPlanning = { id: string; tecnico_id: string | null; ora_inizio: string | null; cliente: string; indirizzo: string; descrizione: string; priorita: Priorita; stato: StatoIntervento }`

- [ ] **Step 1: Scrivere i test delle funzioni del tabellone**

Creare `lib/planning.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { fasceOrarie, fasciaDiAppartenenza, idCella, leggiCella } from './planning'

describe('fasceOrarie', () => {
  it('copre la giornata lavorativa a passi di un ora', () => {
    const fasce = fasceOrarie()
    expect(fasce[0]).toBe('07:00')
    expect(fasce.at(-1)).toBe('19:00')
    expect(fasce).toHaveLength(13)
  })

  it('accetta un intervallo personalizzato', () => {
    expect(fasceOrarie(8, 10)).toEqual(['08:00', '09:00', '10:00'])
  })
})

describe('fasciaDiAppartenenza', () => {
  it('assegna l intervento alla fascia dell ora di inizio', () => {
    expect(fasciaDiAppartenenza('09:30:00')).toBe('09:00')
    expect(fasciaDiAppartenenza('09:00:00')).toBe('09:00')
  })

  it('restituisce null senza ora di inizio', () => {
    expect(fasciaDiAppartenenza(null)).toBeNull()
  })

  it('accetta anche l ora senza secondi', () => {
    expect(fasciaDiAppartenenza('14:45')).toBe('14:00')
  })
})

describe('idCella', () => {
  it('crea e rilegge l identificativo di una cella', () => {
    const id = idCella('tec-1', '09:00')
    expect(leggiCella(id)).toEqual({ tecnicoId: 'tec-1', fascia: '09:00' })
  })

  it('sopravvive a un id utente con trattini', () => {
    const uuid = '0f1e2d3c-4b5a-6789-abcd-ef0123456789'
    expect(leggiCella(idCella(uuid, '17:00'))).toEqual({ tecnicoId: uuid, fascia: '17:00' })
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run lib/planning.test.ts`
Expected: FAIL — `Failed to resolve import "./planning"`.

- [ ] **Step 3: Implementare `lib/planning.ts`**

```typescript
export function fasceOrarie(dalle = 7, alle = 19): string[] {
  const fasce: string[] = []
  for (let ora = dalle; ora <= alle; ora += 1) {
    fasce.push(`${String(ora).padStart(2, '0')}:00`)
  }
  return fasce
}

export function fasciaDiAppartenenza(oraInizio: string | null): string | null {
  if (!oraInizio) return null
  return `${oraInizio.slice(0, 2)}:00`
}

const SEPARATORE = '@'

export function idCella(tecnicoId: string, fascia: string): string {
  return `${tecnicoId}${SEPARATORE}${fascia}`
}

export function leggiCella(id: string): { tecnicoId: string; fascia: string } {
  const taglio = id.lastIndexOf(SEPARATORE)
  return { tecnicoId: id.slice(0, taglio), fascia: id.slice(taglio + 1) }
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run lib/planning.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 5: Scrivere le server action del planning**

Creare `app/(ufficio)/planning/azioni.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'

export async function spostaIntervento(
  interventoId: string,
  tecnicoId: string,
  fascia: string,
) {
  const supabase = await clientServer()
  const { error } = await supabase
    .from('interventi')
    .update({ tecnico_id: tecnicoId, ora_inizio: `${fascia}:00` })
    .eq('id', interventoId)

  if (error) throw new Error(error.message)
  revalidatePath('/planning')
}

export async function creaClienteRapido(dati: FormData) {
  const supabase = await clientServer()

  const { data: cliente, error: erroreCliente } = await supabase
    .from('clienti')
    .insert({
      ragione_sociale: String(dati.get('ragione_sociale') ?? '').trim(),
      telefono: String(dati.get('telefono') ?? '').trim() || null,
    })
    .select('id')
    .single()
  if (erroreCliente || !cliente) throw new Error(erroreCliente?.message ?? 'Cliente non creato')

  const { data: sede, error: erroreSede } = await supabase
    .from('sedi')
    .insert({
      cliente_id: cliente.id,
      indirizzo: String(dati.get('indirizzo') ?? '').trim(),
      comune: String(dati.get('comune') ?? '').trim() || null,
    })
    .select('id')
    .single()
  if (erroreSede || !sede) throw new Error(erroreSede?.message ?? 'Sede non creata')

  revalidatePath('/planning')
  return { clienteId: cliente.id, sedeId: sede.id }
}

export async function creaIntervento(dati: FormData) {
  const sedeId = String(dati.get('sede_id') ?? '')
  const descrizione = String(dati.get('descrizione') ?? '').trim()
  if (!sedeId) return { errore: 'Scegli una sede.' }
  if (!descrizione) return { errore: 'Scrivi cosa va fatto.' }

  const supabase = await clientServer()
  const oraInizio = String(dati.get('ora_inizio') ?? '')

  // Nessun cliente_id da passare: lo schema lo ricava dalla sede.
  const { error } = await supabase.from('interventi').insert({
    sede_id: sedeId,
    tecnico_id: String(dati.get('tecnico_id') ?? '') || null,
    data: String(dati.get('data') ?? ''),
    ora_inizio: oraInizio ? `${oraInizio}:00` : null,
    durata_prevista_minuti: Number(dati.get('durata') ?? 60),
    descrizione,
    priorita: (String(dati.get('priorita') ?? 'normale') as 'bassa' | 'normale' | 'urgente'),
  })

  if (error) return { errore: error.message }

  revalidatePath('/planning')
  return {}
}
```

- [ ] **Step 6: Implementare il tabellone con drag and drop**

Creare `components/ufficio/CardPlanning.tsx`: card compatta trascinabile con `useDraggable` di `@dnd-kit/core`, che mostra ora, cliente, indirizzo abbreviato e un bordo colorato per la priorità.

Creare `components/ufficio/Tabellone.tsx`:

```tsx
'use client'

import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { fasceOrarie, fasciaDiAppartenenza, idCella, leggiCella } from '@/lib/planning'
import { spostaIntervento } from '@/app/(ufficio)/planning/azioni'
import { CardPlanning, type InterventoPlanning } from './CardPlanning'

export type TecnicoColonna = { id: string; nome: string; colore: string }

function Cella({
  tecnicoId,
  fascia,
  children,
}: {
  tecnicoId: string
  fascia: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: idCella(tecnicoId, fascia) })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-20 border-b border-r p-1 align-top ${isOver ? 'bg-blue-50' : 'bg-white'}`}
    >
      {children}
    </div>
  )
}

export function Tabellone({
  tecnici,
  interventi,
}: {
  tecnici: TecnicoColonna[]
  interventi: InterventoPlanning[]
}) {
  const router = useRouter()
  const [, avvia] = useTransition()
  const sensori = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const fasce = fasceOrarie()

  function alRilascio(evento: DragEndEvent) {
    const destinazione = evento.over?.id
    if (!destinazione) return
    const { tecnicoId, fascia } = leggiCella(String(destinazione))
    const interventoId = String(evento.active.id)

    avvia(async () => {
      await spostaIntervento(interventoId, tecnicoId, fascia)
      router.refresh()
    })
  }

  return (
    <DndContext sensors={sensori} onDragEnd={alRilascio}>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max border-l border-t text-sm"
          style={{ gridTemplateColumns: `5rem repeat(${tecnici.length}, minmax(14rem, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b border-r bg-slate-100 p-2 font-medium">
            Ora
          </div>
          {tecnici.map((tecnico) => (
            <div
              key={tecnico.id}
              className="border-b border-r bg-slate-100 p-2 font-medium"
              style={{ borderTop: `3px solid ${tecnico.colore}` }}
            >
              {tecnico.nome}
            </div>
          ))}

          {fasce.map((fascia) => (
            <div key={fascia} className="contents">
              <div className="sticky left-0 z-10 border-b border-r bg-slate-50 p-2 tabular-nums">
                {fascia}
              </div>
              {tecnici.map((tecnico) => (
                <Cella key={`${tecnico.id}-${fascia}`} tecnicoId={tecnico.id} fascia={fascia}>
                  {interventi
                    .filter(
                      (i) =>
                        i.tecnico_id === tecnico.id &&
                        fasciaDiAppartenenza(i.ora_inizio) === fascia,
                    )
                    .map((intervento) => (
                      <CardPlanning key={intervento.id} intervento={intervento} />
                    ))}
                </Cella>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  )
}
```

Sopra il tabellone, una colonna "Da assegnare" elenca gli interventi del giorno con `tecnico_id` nullo, trascinabili nelle celle come gli altri.

- [ ] **Step 7: Implementare il dialog di creazione**

Creare `components/ufficio/DialogIntervento.tsx`: un `<dialog>` nativo aperto da un pulsante "Nuovo intervento", con `select` di sede (raggruppata per cliente con `<optgroup>`), `select` tecnico, campi data, ora, durata, priorità, descrizione, e un pannello a espansione "Cliente nuovo" che chiama `creaClienteRapido` e poi preseleziona la sede creata. Il submit chiama `creaIntervento` con `useActionState` e mostra `stato.errore` se presente.

- [ ] **Step 8: Implementare la pagina di planning**

Creare `app/(ufficio)/planning/page.tsx`: legge la data da `searchParams.data` (default oggi), i tecnici attivi (`utenti` con `ruolo = 'tecnico'` e `attivo`), gli interventi della data con cliente e sede, le sedi per il dialog, e rende la barra data (giorno precedente/successivo), `<DialogIntervento />` e `<Tabellone />`.

- [ ] **Step 9: Verificare a mano il trascinamento**

Run: `npm run dev`, accedere come ufficio, aprire `/planning`.
Expected: il tabellone mostra una colonna per tecnico; trascinando una card in un'altra cella l'intervento cambia tecnico e ora, e il cambiamento sopravvive al ricaricamento della pagina.

Run: `npx supabase db execute --sql "select descrizione, tecnico_id, ora_inizio from interventi where data = current_date;"`
Expected: la riga spostata riporta il nuovo tecnico e la nuova ora.

- [ ] **Step 10: Commit**

```bash
git add lib/planning.ts lib/planning.test.ts app/\(ufficio\) components/ufficio
git commit -m "feat(ufficio): add daily dispatch board with drag and drop and quick job creation"
```

---

### Task 12: Rapportini da fatturare, dettaglio ed export

**Files:**
- Create: `app/(ufficio)/rapportini/page.tsx`
- Create: `app/(ufficio)/rapportini/[id]/page.tsx`
- Create: `app/(ufficio)/rapportini/[id]/stampa/page.tsx`
- Create: `app/(ufficio)/rapportini/azioni.ts`
- Create: `app/api/export/rapportini/route.ts`
- Create: `lib/export.ts`
- Test: `lib/export.test.ts`

**Interfaces:**
- Consumes: `calcolaTotali`, `formattaEuro`, `formattaOre` da `lib/calcoli.ts`; `clientServer`, `richiediRuolo`.
- Produces:
  - `type RigaExport = { numero: string; data: string; cliente: string; partita_iva: string | null; descrizione: string; ore: number; importo_ore: number; importo_materiali: number; totale: number }`
  - `generaCsv(righe: RigaExport[]): string` da `lib/export.ts`
  - `segnaFatturato(rapportinoId: string): Promise<void>` da `app/(ufficio)/rapportini/azioni.ts`
  - `GET /api/export/rapportini?dal=YYYY-MM-DD&al=YYYY-MM-DD` che restituisce un CSV con `Content-Disposition: attachment`

- [ ] **Step 1: Scrivere i test dell'export CSV**

Creare `lib/export.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { generaCsv, type RigaExport } from './export'

const riga: RigaExport = {
  numero: 'RAP-2026-0001',
  data: '2026-09-12',
  cliente: 'Panificio Rossi S.r.l.',
  partita_iva: '01234567890',
  descrizione: 'Sostituzione valvola',
  ore: 2,
  importo_ore: 80,
  importo_materiali: 33.1,
  totale: 113.1,
}

describe('generaCsv', () => {
  it('scrive l intestazione con punto e virgola, come attende il commercialista', () => {
    const csv = generaCsv([riga])
    expect(csv.split('\n')[0]).toBe(
      'Numero;Data;Cliente;Partita IVA;Descrizione;Ore;Importo ore;Importo materiali;Totale',
    )
  })

  it('usa la virgola come separatore decimale', () => {
    const csv = generaCsv([riga])
    expect(csv).toContain('113,10')
    expect(csv).toContain('33,10')
  })

  it('protegge i campi che contengono il separatore', () => {
    const csv = generaCsv([{ ...riga, cliente: 'Rossi; Bianchi S.n.c.' }])
    expect(csv).toContain('"Rossi; Bianchi S.n.c."')
  })

  it('raddoppia le virgolette interne', () => {
    const csv = generaCsv([{ ...riga, descrizione: 'Valvola da 1/2" sostituita' }])
    expect(csv).toContain('"Valvola da 1/2"" sostituita"')
  })

  it('lascia vuota la partita IVA assente invece di scrivere null', () => {
    const csv = generaCsv([{ ...riga, partita_iva: null }])
    expect(csv).not.toContain('null')
    expect(csv.split('\n')[1].split(';')[3]).toBe('')
  })

  it('scrive una riga per rapportino', () => {
    const csv = generaCsv([riga, { ...riga, numero: 'RAP-2026-0002' }])
    expect(csv.trim().split('\n')).toHaveLength(3)
  })

  it('restituisce solo l intestazione su elenco vuoto', () => {
    expect(generaCsv([]).trim().split('\n')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run lib/export.test.ts`
Expected: FAIL — `Failed to resolve import "./export"`.

- [ ] **Step 3: Implementare `lib/export.ts`**

```typescript
export type RigaExport = {
  numero: string
  data: string
  cliente: string
  partita_iva: string | null
  descrizione: string
  ore: number
  importo_ore: number
  importo_materiali: number
  totale: number
}

const INTESTAZIONE = [
  'Numero',
  'Data',
  'Cliente',
  'Partita IVA',
  'Descrizione',
  'Ore',
  'Importo ore',
  'Importo materiali',
  'Totale',
]

function campo(valore: string): string {
  if (/[;"\n]/.test(valore)) return `"${valore.replace(/"/g, '""')}"`
  return valore
}

function numero(valore: number): string {
  return valore.toFixed(2).replace('.', ',')
}

export function generaCsv(righe: RigaExport[]): string {
  const corpo = righe.map((r) =>
    [
      campo(r.numero),
      r.data,
      campo(r.cliente),
      campo(r.partita_iva ?? ''),
      campo(r.descrizione),
      numero(r.ore),
      numero(r.importo_ore),
      numero(r.importo_materiali),
      numero(r.totale),
    ].join(';'),
  )
  return [INTESTAZIONE.join(';'), ...corpo].join('\n') + '\n'
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run lib/export.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 5: Implementare la lista dei rapportini**

Creare `app/(ufficio)/rapportini/page.tsx`: `richiediRuolo(['ufficio', 'titolare'])`, legge i rapportini con `stato_fatturazione = 'da_fatturare'` (filtro modificabile via `searchParams.stato`) con intervento, cliente, tecnico e le righe di ore e materiali, calcola il totale con `calcolaTotali` e rende una tabella con data, cliente, tecnico, ore totali, totale e un link al dettaglio. In testa, un link a `/api/export/rapportini?dal=…&al=…` per scaricare il CSV del periodo.

Né la stampa né il CSV cambiano lo stato del rapportino. Sono operazioni del browser: una stampa si annulla, un download si interrompe, e un rapportino marcato `fatturato` senza fattura emessa è un lavoro che nessuno rifattura più. Lo stato passa a `fatturato` solo con l'azione esplicita del passo successivo, dopo che il commercialista ha emesso.

- [ ] **Step 6: Implementare il dettaglio**

Creare `app/(ufficio)/rapportini/[id]/page.tsx`: mostra intestazione cliente e sede, la tabella delle ore per tipo con tariffa e importo, la tabella dei materiali con quantità e prezzo, il riepilogo `Costo ore + Costo materiali = Totale intervento`, le note, il nome del firmatario e la firma come immagine (URL firmato con `createSignedUrl` su 60 secondi). Due pulsanti: un link a `/rapportini/[id]/stampa` che apre la versione stampabile, e un form che invoca `segnaFatturato` con l'etichetta "Segna come fatturato" — l'unico punto in cui lo stato cambia.

Creare `app/(ufficio)/rapportini/azioni.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'

export async function segnaFatturato(rapportinoId: string) {
  const supabase = await clientServer()
  const { error } = await supabase
    .from('rapportini')
    .update({ stato_fatturazione: 'fatturato' })
    .eq('id', rapportinoId)
  if (error) throw new Error(error.message)

  revalidatePath('/rapportini')
  revalidatePath(`/rapportini/${rapportinoId}`)
}
```

- [ ] **Step 7: Implementare la pagina stampabile**

Creare `app/(ufficio)/rapportini/[id]/stampa/page.tsx`: stessa sostanza del dettaglio, senza navigazione né pulsanti, con intestazione aziendale, e un `<style>` con `@page { size: A4; margin: 16mm }` più classi `print:hidden` sul pulsante "Stampa o salva in PDF" che chiama `window.print()`. Il PDF si ottiene dalla stampa del browser: nessuna libreria di generazione, nessun carattere da incorporare.

- [ ] **Step 8: Implementare la route CSV**

Creare `app/api/export/rapportini/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { clientServer } from '@/lib/supabase/server'
import { calcolaTotali } from '@/lib/calcoli'
import { generaCsv, type RigaExport } from '@/lib/export'

export async function GET(request: NextRequest) {
  const dal = request.nextUrl.searchParams.get('dal') ?? '1900-01-01'
  const al = request.nextUrl.searchParams.get('al') ?? '2999-12-31'

  const supabase = await clientServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorizzato', { status: 401 })

  const { data, error } = await supabase
    .from('rapportini')
    .select(
      `id, chiuso_il,
       interventi!inner ( data, descrizione, sedi ( clienti ( ragione_sociale, partita_iva ) ) ),
       rapportino_ore ( tipo, minuti, prezzo_orario ),
       rapportino_materiali ( quantita, prezzo_vendita )`,
    )
    .gte('interventi.data', dal)
    .lte('interventi.data', al)
    .order('chiuso_il', { ascending: true })

  if (error) return new NextResponse(error.message, { status: 500 })

  const righe: RigaExport[] = (data ?? []).map((r, indice) => {
    const totali = calcolaTotali(r.rapportino_ore ?? [], r.rapportino_materiali ?? [])
    const anno = (r.interventi?.data ?? '').slice(0, 4)
    return {
      numero: `RAP-${anno}-${String(indice + 1).padStart(4, '0')}`,
      data: r.interventi?.data ?? '',
      cliente: r.interventi?.sedi?.clienti?.ragione_sociale ?? '',
      partita_iva: r.interventi?.sedi?.clienti?.partita_iva ?? null,
      descrizione: r.interventi?.descrizione ?? '',
      ore: (r.rapportino_ore ?? []).reduce((s, o) => s + o.minuti, 0) / 60,
      importo_ore: totali.ricavoOre,
      importo_materiali: totali.ricavoMateriali,
      totale: totali.totale,
    }
  })

  return new NextResponse(generaCsv(righe), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rapportini-${dal}_${al}.csv"`,
    },
  })
}
```

- [ ] **Step 9: Verificare a mano**

Run: `npm run dev`, accedere come ufficio, chiudere prima un rapportino dal lato tecnico.
Expected: `/rapportini` mostra il rapportino con il totale corretto; il dettaglio mostra righe e firma; `/rapportini/[id]/stampa` stampa su una pagina; il link CSV scarica un file che si apre in Excel con le colonne separate.

- [ ] **Step 10: Commit**

```bash
git add lib/export.ts lib/export.test.ts app/\(ufficio\)/rapportini app/api
git commit -m "feat(ufficio): list closed reports with totals, printable detail and CSV export"
```

---

### Task 13: Scadenzario manutenzioni

**Files:**
- Create: `app/(ufficio)/scadenzario/page.tsx`
- Create: `app/(ufficio)/scadenzario/azioni.ts`
- Create: `components/ufficio/BadgeScadenza.tsx`
- Test: `components/ufficio/BadgeScadenza.test.tsx`

**Interfaces:**
- Consumes: `statoScadenza` da `lib/calcoli.ts`; `richiediRuolo`, `clientServer`.
- Produces:
  - `<BadgeScadenza prossima={string | null} oggi?: Date />` da `components/ufficio/BadgeScadenza.tsx`
  - `registraManutenzione(impiantoId: string, data: string): Promise<void>` da `app/(ufficio)/scadenzario/azioni.ts`

- [ ] **Step 1: Scrivere il test del badge**

Creare `components/ufficio/BadgeScadenza.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BadgeScadenza } from './BadgeScadenza'

const oggi = new Date('2026-09-12T08:00:00Z')

describe('BadgeScadenza', () => {
  it('mostra un badge rosso per le scadenze passate', () => {
    render(<BadgeScadenza prossima="2026-07-01" oggi={oggi} />)
    const badge = screen.getByText(/Scaduto/)
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-red')
  })

  it('mostra un badge giallo entro trenta giorni', () => {
    render(<BadgeScadenza prossima="2026-10-01" oggi={oggi} />)
    const badge = screen.getByText(/In scadenza/)
    expect(badge.className).toContain('bg-amber')
  })

  it('mostra la data quando e lontana', () => {
    render(<BadgeScadenza prossima="2027-03-01" oggi={oggi} />)
    expect(screen.getByText('01/03/2027')).toBeInTheDocument()
  })

  it('segnala l assenza di dati di manutenzione', () => {
    render(<BadgeScadenza prossima={null} oggi={oggi} />)
    expect(screen.getByText('Mai registrata')).toBeInTheDocument()
  })

  it('dice da quanti giorni e scaduto', () => {
    render(<BadgeScadenza prossima="2026-09-02" oggi={oggi} />)
    expect(screen.getByText('Scaduto da 10 giorni')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run components/ufficio/BadgeScadenza.test.tsx`
Expected: FAIL — `Failed to resolve import "./BadgeScadenza"`.

- [ ] **Step 3: Implementare il badge**

Creare `components/ufficio/BadgeScadenza.tsx`:

```tsx
import { statoScadenza } from '@/lib/calcoli'

const giorniTra = (da: string, a: Date) =>
  Math.round(
    (Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) -
      new Date(`${da}T00:00:00Z`).getTime()) /
      86_400_000,
  )

export function BadgeScadenza({
  prossima,
  oggi = new Date(),
}: {
  prossima: string | null
  oggi?: Date
}) {
  const stato = statoScadenza(prossima, oggi)

  if (stato === 'sconosciuto') {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
        Mai registrata
      </span>
    )
  }

  const dataItaliana = new Intl.DateTimeFormat('it-IT').format(new Date(`${prossima}T00:00:00Z`))

  if (stato === 'scaduto') {
    const giorni = giorniTra(prossima!, oggi)
    return (
      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
        {giorni === 1 ? 'Scaduto da 1 giorno' : `Scaduto da ${giorni} giorni`}
      </span>
    )
  }

  if (stato === 'in_scadenza') {
    return (
      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-amber-950">
        In scadenza il {dataItaliana}
      </span>
    )
  }

  return <span className="text-xs tabular-nums text-slate-600">{dataItaliana}</span>
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run components/ufficio/BadgeScadenza.test.tsx`
Expected: PASS, 5 test.

- [ ] **Step 5: Implementare l'azione di registrazione manutenzione**

Creare `app/(ufficio)/scadenzario/azioni.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'

export async function registraManutenzione(impiantoId: string, data: string) {
  const supabase = await clientServer()
  const { error } = await supabase
    .from('impianti')
    .update({ ultima_manutenzione: data })
    .eq('id', impiantoId)
  if (error) throw new Error(error.message)

  // prossima_manutenzione è generata dal database: nessun calcolo qui.
  revalidatePath('/scadenzario')
}
```

- [ ] **Step 6: Implementare la pagina dello scadenzario**

Creare `app/(ufficio)/scadenzario/page.tsx`: `richiediRuolo(['ufficio', 'titolare'])`, legge gli impianti attivi con sede e cliente ordinati per `prossima_manutenzione` crescente con i null per ultimi, e rende una tabella con tipo, marca e modello, cliente, indirizzo, telefono cliccabile (`tel:`), ultima manutenzione, `<BadgeScadenza />` e un pulsante "Registrata oggi" che invoca `registraManutenzione(id, oggi)`. In testa, tre contatori: scaduti, in scadenza entro trenta giorni, totale attivi.

- [ ] **Step 7: Verificare a mano**

Run: `npm run dev`, aprire `/scadenzario` come ufficio.
Expected: la caldaia del condominio (seed a 13 mesi) compare in cima con badge rosso; toccando "Registrata oggi" la riga scende in fondo con data a un anno.

Run: `npx supabase db execute --sql "select tipo, ultima_manutenzione, prossima_manutenzione from impianti order by prossima_manutenzione;"`
Expected: `prossima_manutenzione` della riga aggiornata è esattamente dodici mesi dopo oggi.

- [ ] **Step 8: Commit**

```bash
git add app/\(ufficio\)/scadenzario components/ufficio/BadgeScadenza.tsx components/ufficio/BadgeScadenza.test.tsx
git commit -m "feat(ufficio): add maintenance schedule with overdue badges and one-tap update"
```

---

### Task 14: Dashboard margini del titolare

**Files:**
- Create: `app/(titolare)/dashboard/page.tsx`
- Create: `components/titolare/TesseraKpi.tsx`
- Create: `lib/periodo.ts`
- Test: `lib/periodo.test.ts`

**Interfaces:**
- Consumes: la funzione SQL `margini(dal, al)` di Task 3; `formattaEuro` da `lib/calcoli.ts`; `richiediRuolo`, `clientServer`.
- Produces:
  - `periodoCorrente(riferimento?: Date): { dal: string; al: string }` da `lib/periodo.ts` — mese corrente
  - `periodoDaParametri(dal?: string, al?: string, riferimento?: Date): { dal: string; al: string }` da `lib/periodo.ts`
  - `<TesseraKpi etichetta={string} valore={string} dettaglio={string} tono={'neutro' | 'positivo' | 'negativo'} />`

- [ ] **Step 1: Scrivere i test del periodo**

Creare `lib/periodo.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { periodoCorrente, periodoDaParametri } from './periodo'

const riferimento = new Date('2026-09-12T10:00:00Z')

describe('periodoCorrente', () => {
  it('copre il mese in corso dal primo all ultimo giorno', () => {
    expect(periodoCorrente(riferimento)).toEqual({ dal: '2026-09-01', al: '2026-09-30' })
  })

  it('gestisce febbraio negli anni non bisestili', () => {
    expect(periodoCorrente(new Date('2026-02-10T00:00:00Z'))).toEqual({
      dal: '2026-02-01',
      al: '2026-02-28',
    })
  })

  it('gestisce febbraio negli anni bisestili', () => {
    expect(periodoCorrente(new Date('2028-02-10T00:00:00Z'))).toEqual({
      dal: '2028-02-01',
      al: '2028-02-29',
    })
  })

  it('gestisce dicembre senza sfondare nell anno dopo', () => {
    expect(periodoCorrente(new Date('2026-12-31T00:00:00Z'))).toEqual({
      dal: '2026-12-01',
      al: '2026-12-31',
    })
  })
})

describe('periodoDaParametri', () => {
  it('usa il mese corrente se i parametri mancano', () => {
    expect(periodoDaParametri(undefined, undefined, riferimento)).toEqual({
      dal: '2026-09-01',
      al: '2026-09-30',
    })
  })

  it('accetta un periodo esplicito', () => {
    expect(periodoDaParametri('2026-01-01', '2026-06-30', riferimento)).toEqual({
      dal: '2026-01-01',
      al: '2026-06-30',
    })
  })

  it('scarta date non valide e torna al mese corrente', () => {
    expect(periodoDaParametri('ieri', 'domani', riferimento)).toEqual({
      dal: '2026-09-01',
      al: '2026-09-30',
    })
  })

  it('inverte gli estremi se arrivano al contrario', () => {
    expect(periodoDaParametri('2026-06-30', '2026-01-01', riferimento)).toEqual({
      dal: '2026-01-01',
      al: '2026-06-30',
    })
  })
})
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `npx vitest run lib/periodo.test.ts`
Expected: FAIL — `Failed to resolve import "./periodo"`.

- [ ] **Step 3: Implementare `lib/periodo.ts`**

```typescript
const FORMATO = /^\d{4}-\d{2}-\d{2}$/

function iso(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

export function periodoCorrente(riferimento: Date = new Date()) {
  const anno = riferimento.getUTCFullYear()
  const mese = riferimento.getUTCMonth() + 1
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate()
  return { dal: iso(anno, mese, 1), al: iso(anno, mese, ultimo) }
}

function valida(valore: string | undefined): string | null {
  if (!valore || !FORMATO.test(valore)) return null
  return Number.isNaN(new Date(`${valore}T00:00:00Z`).getTime()) ? null : valore
}

export function periodoDaParametri(
  dal: string | undefined,
  al: string | undefined,
  riferimento: Date = new Date(),
) {
  const primo = valida(dal)
  const secondo = valida(al)
  if (!primo || !secondo) return periodoCorrente(riferimento)
  return primo <= secondo ? { dal: primo, al: secondo } : { dal: secondo, al: primo }
}
```

- [ ] **Step 4: Verificare che i test passino**

Run: `npx vitest run lib/periodo.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 5: Implementare la tessera KPI**

Creare `components/titolare/TesseraKpi.tsx`:

```tsx
import { cn } from '@/lib/utils'

export function TesseraKpi({
  etichetta,
  valore,
  dettaglio,
  tono = 'neutro',
}: {
  etichetta: string
  valore: string
  dettaglio?: string
  tono?: 'neutro' | 'positivo' | 'negativo'
}) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <h2 className="text-sm text-slate-600">{etichetta}</h2>
      <p
        className={cn(
          'mt-2 text-3xl font-semibold tabular-nums',
          tono === 'positivo' && 'text-green-700',
          tono === 'negativo' && 'text-red-700',
        )}
      >
        {valore}
      </p>
      {dettaglio && <p className="mt-1 text-xs text-slate-500">{dettaglio}</p>}
    </article>
  )
}
```

- [ ] **Step 6: Implementare la dashboard**

Creare `app/(titolare)/dashboard/page.tsx`: `richiediRuolo(['titolare'])`, legge il periodo con `periodoDaParametri(searchParams.dal, searchParams.al)`, chiama `supabase.rpc('margini', { dal, al })`, somma ricavi, costi e margine, e rende:

- quattro `<TesseraKpi />`: ricavo totale, costo del lavoro, costo dei materiali, margine (tono positivo se maggiore di zero, negativo altrimenti) con la percentuale come dettaglio;
- quando almeno una riga ha `margine_incompleto` a `true`, un avviso sopra le tessere: "Margine parziale: N interventi senza tariffa di costo del tecnico", con il link all'anagrafica. Il margine di quelle righe risulterebbe pari al ricavo, quindi va detto invece di essere presentato come un dato completo;
- una tabella per tecnico: nome, numero di interventi, ore fatturate, ricavo, margine, margine percentuale — ottenuta raggruppando le righe di `margini` per `tecnico_id` e unendo i nomi da `utenti`;
- una tabella per tipo di ora (viaggio, ordinario, urgenza) con ore totali e ricavo, letta da `rapportino_ore` sul periodo — solo colonne di ricavo, le sole concesse;
- una tabella dei dieci materiali più venduti con ricarico percentuale, letta da `supabase.rpc('listino_con_costi')`: è l'unica via per i prezzi di acquisto, perché la colonna è revocata anche al titolare;
- un form GET con due campi data per cambiare periodo.

Se `margini` restituisce zero righe, mostrare "Nessun intervento chiuso nel periodo" al posto delle tabelle.

- [ ] **Step 7: Verificare che i costi restino invisibili agli altri ruoli**

Run: `npx vitest run tests/rls.test.ts`
Expected: PASS — in particolare il test che `margini()` non restituisce righe all'ufficio.

Run: aprire `/dashboard` come ufficio.
Expected: reindirizzamento a `/planning`.

- [ ] **Step 8: Commit**

```bash
git add app/\(titolare\) components/titolare lib/periodo.ts lib/periodo.test.ts
git commit -m "feat(titolare): add margin dashboard by period, technician and hour type"
```

---

### Task 15: PWA installabile e percorso end to end

**Files:**
- Create: `app/manifest.ts`
- Create: `public/icona-192.png`, `public/icona-512.png`
- Create: `e2e/rapportino.spec.ts`
- Create: `playwright.config.ts`
- Modify: `app/layout.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: tutto il lavoro precedente.
- Produces: il manifest della PWA; la suite Playwright eseguibile con `npm run test:e2e`.

- [ ] **Step 1: Scrivere il manifest**

Creare `app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestionale termoidraulico',
    short_name: 'Rapportini',
    description: 'Rapportini, planning e scadenzario per l azienda termoidraulica',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

In `app/layout.tsx` aggiungere ai metadata il viewport corretto per il tocco:

```tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
}
```

Generare due icone piene con il colore del tema:

```bash
npx --yes sharp-cli --input /dev/null 2>/dev/null || true
python3 - <<'PY'
import struct, zlib
def png(lato, percorso):
    r, g, b = 0x25, 0x63, 0xeb
    riga = b'\x00' + bytes([r, g, b]) * lato
    grezzo = riga * lato
    def blocco(tipo, dati):
        return (struct.pack('>I', len(dati)) + tipo + dati
                + struct.pack('>I', zlib.crc32(tipo + dati) & 0xffffffff))
    contenuto = (b'\x89PNG\r\n\x1a\n'
        + blocco(b'IHDR', struct.pack('>IIBBBBB', lato, lato, 8, 2, 0, 0, 0))
        + blocco(b'IDAT', zlib.compress(grezzo, 9))
        + blocco(b'IEND', b''))
    open(percorso, 'wb').write(contenuto)
png(192, 'public/icona-192.png')
png(512, 'public/icona-512.png')
PY
```

- [ ] **Step 2: Configurare Playwright**

Creare `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

Run: `npx playwright install chromium`

- [ ] **Step 3: Scrivere il test end to end**

Creare `e2e/rapportino.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, service, { auth: { persistSession: false } })

const PASSWORD = 'prova-1234'
const emailTecnico = 'e2e-tecnico@prova.test'
const emailUfficio = 'e2e-ufficio@prova.test'

test.beforeAll(async () => {
  async function utente(email: string, ruolo: 'tecnico' | 'ufficio') {
    const { data } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })
    const id = data?.user?.id
    if (id) {
      await admin.from('utenti').upsert({ id, nome: email, ruolo, tariffa_costo_oraria: 22 })
    }
    return id
  }

  const tecnicoId = await utente(emailTecnico, 'tecnico')
  await utente(emailUfficio, 'ufficio')

  const { data: cliente } = await admin
    .from('clienti')
    .insert({ ragione_sociale: 'Cliente E2E' })
    .select('id')
    .single()
  const { data: sede } = await admin
    .from('sedi')
    .insert({ cliente_id: cliente!.id, indirizzo: 'Via E2E 1', comune: 'Brescia' })
    .select('id')
    .single()
  await admin.from('interventi').insert({
    sede_id: sede!.id,
    tecnico_id: tecnicoId,
    data: new Date().toISOString().slice(0, 10),
    ora_inizio: '09:00:00',
    descrizione: 'Intervento E2E',
  })
})

async function accedi(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra' }).click()
}

test('il tecnico chiude il rapportino e l ufficio lo vede con il totale corretto', async ({
  page,
}) => {
  await accedi(page, emailTecnico)
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible()
  await expect(page.getByText('Cliente E2E')).toBeVisible()

  await page.getByRole('link', { name: /Apri rapportino/i }).first().click()

  // Ore: 30 minuti di viaggio, 60 di ordinario
  await page.getByRole('button', { name: 'Aggiungi 15 minuti a viaggio' }).click()
  await page.getByRole('button', { name: 'Aggiungi 15 minuti a viaggio' }).click()
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Aggiungi 15 minuti a ordinario' }).click()
  }

  // Materiali: due valvole a sfera da 1/2
  await page.getByRole('button', { name: 'Materiali' }).click()
  await page.getByRole('searchbox', { name: /Cerca materiale/i }).fill('sfera 1/2')
  await page.getByRole('button', { name: /Aggiungi Valvola a sfera 1\/2/i }).click()
  await page.getByRole('button', { name: /Aumenta Valvola a sfera 1\/2/i }).click()

  // Note e firma
  await page.getByRole('button', { name: 'Note e firma' }).click()
  await page.getByLabel(/Note/i).fill('Sostituita valvola, impianto in pressione.')
  await page.getByLabel(/Firmato da/i).fill('Sig. Rossi')

  // 0,5 h x 30 + 1 h x 40 + 2 x 11 = 77,00 euro
  await expect(page.getByText('77,00 €')).toBeVisible()

  await page.getByRole('button', { name: 'Chiudi rapportino' }).click()
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible()
  await expect(page.getByText('Chiuso')).toBeVisible()

  // L ufficio vede il rapportino da fatturare
  const contesto = await page.context().browser()!.newContext()
  const pagina = await contesto.newPage()
  await accedi(pagina, emailUfficio)
  await pagina.goto('/rapportini')
  await expect(pagina.getByText('Cliente E2E')).toBeVisible()
  await expect(pagina.getByText('77,00 €')).toBeVisible()
  await contesto.close()
})
```

- [ ] **Step 4: Eseguire il test end to end**

Run: `npm run db:reset && npm run test:e2e`
Expected: PASS, 1 test. Se fallisce sul totale, controllare `impostazioni` (viaggio 30, ordinario 40) e il prezzo di `VAL-SFE-12` (11,00).

- [ ] **Step 5: Eseguire la suite completa**

Run: `npm run test && npm run build`
Expected: tutti i test unitari passano; build senza errori.

- [ ] **Step 6: Scrivere il README**

Sostituire `README.md` con: cosa fa l'applicazione, i tre ruoli, i comandi (`npm run dev`, `npm run db:reset`, `npm run test`, `npm run test:e2e`), come creare il primo utente titolare, come cambiare le tariffe orarie in `impostazioni`, e la nota che la fattura la emette il commercialista dall'export CSV.

Per il primo titolare, documentare:

```bash
npx supabase db execute --sql "
  update utenti set ruolo = 'titolare' where id = (
    select id from auth.users where email = 'titolare@azienda.it'
  );
"
```

- [ ] **Step 7: Commit**

```bash
git add app/manifest.ts app/layout.tsx public e2e playwright.config.ts README.md
git commit -m "feat: make app installable as PWA and cover the report flow end to end"
```

---

## Note di esecuzione

- Le migrazioni sono additive e numerate: non modificare una migrazione già applicata in produzione, aggiungerne una nuova.
- `npm run db:reset` cancella i dati locali e riapplica schema e seed. Non eseguirlo su un database con dati veri.
- I test RLS e di chiusura creano utenti reali nel database locale: girano contro `supabase start`, non contro un database remoto.

---

### Task 16: Aggiornamento istantaneo in ufficio e rapportini non firmati

Questo task copre i tre punti della spec che i task precedenti lasciavano scoperti: il "istantaneamente" del rapportino chiuso, la segnalazione del rapportino senza firma, e la creazione rapida del cliente dal lato tecnico.

**Files:**
- Create: `components/ufficio/AscoltaRapportini.tsx`
- Create: `app/(tecnico)/rapportino/nuovo/page.tsx`
- Modify: `app/(ufficio)/rapportini/page.tsx` (montare l'ascoltatore, mostrare il badge "Non firmato")
- Modify: `components/tecnico/FormRapportino.tsx` (nessuna firma non blocca la chiusura)
- Test: `components/ufficio/AscoltaRapportini.test.tsx`

**Interfaces:**
- Consumes: `clientBrowser` da `lib/supabase/client.ts`; `creaClienteRapido` da `app/(ufficio)/planning/azioni.ts`.
- Produces:
  - `<AscoltaRapportini />` da `components/ufficio/AscoltaRapportini.tsx` — si iscrive alle `INSERT` su `rapportini` e chiama `router.refresh()`
  - `<PassoFirma note={string} firmatario={string} firmaDataUrl={string|null} totale={number} onCambio={(modifica: Partial<BozzaRapportino>) => void} />` — firma esplicita del componente introdotto in Task 10

- [ ] **Step 1: Abilitare Realtime sulla tabella dei rapportini**

Creare `supabase/migrations/0004_realtime.sql`:

```sql
alter publication supabase_realtime add table rapportini;
```

Run: `npm run db:reset`
Expected: migrazione applicata senza errori.

- [ ] **Step 2: Scrivere il test dell'ascoltatore**

Creare `components/ufficio/AscoltaRapportini.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const on = vi.fn().mockReturnThis()
const subscribe = vi.fn().mockReturnThis()
const removeChannel = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  clientBrowser: () => ({
    channel: () => ({ on, subscribe }),
    removeChannel,
  }),
}))

import { AscoltaRapportini } from './AscoltaRapportini'

beforeEach(() => {
  refresh.mockClear()
  on.mockClear()
  subscribe.mockClear()
  removeChannel.mockClear()
})

describe('AscoltaRapportini', () => {
  it('si iscrive alle insert sulla tabella rapportini', () => {
    render(<AscoltaRapportini />)
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'rapportini' }),
      expect.any(Function),
    )
    expect(subscribe).toHaveBeenCalled()
  })

  it('ricarica la lista quando arriva un rapportino', () => {
    render(<AscoltaRapportini />)
    const gestore = on.mock.calls[0][2] as () => void
    gestore()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('chiude il canale allo smontaggio', () => {
    const { unmount } = render(<AscoltaRapportini />)
    unmount()
    expect(removeChannel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Verificare che i test falliscano**

Run: `npx vitest run components/ufficio/AscoltaRapportini.test.tsx`
Expected: FAIL — `Failed to resolve import "./AscoltaRapportini"`.

- [ ] **Step 4: Implementare l'ascoltatore**

Creare `components/ufficio/AscoltaRapportini.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clientBrowser } from '@/lib/supabase/client'

export function AscoltaRapportini() {
  const router = useRouter()

  useEffect(() => {
    const supabase = clientBrowser()
    const canale = supabase
      .channel('rapportini-in-arrivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rapportini' },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canale)
    }
  }, [router])

  return null
}
```

- [ ] **Step 5: Verificare che i test passino**

Run: `npx vitest run components/ufficio/AscoltaRapportini.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 6: Montare l'ascoltatore e il badge dei non firmati**

In `app/(ufficio)/rapportini/page.tsx`: aggiungere `<AscoltaRapportini />` in cima al `main`, e nella riga di ogni rapportino, quando `firma_url` è nullo, mostrare:

```tsx
<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
  Non firmato
</span>
```

La colonna del dettaglio mostra la stessa segnalazione al posto dell'immagine della firma.

- [ ] **Step 7: Consentire la chiusura senza firma**

In `components/tecnico/FormRapportino.tsx`, il pulsante di chiusura è già disabilitato solo quando `bozza.ore.length === 0`: verificare che la firma non compaia in quella condizione, e aggiungere sotto il pulsante, quando `bozza.firmaDataUrl` è nullo, la riga:

```tsx
<p className="mt-2 text-xs text-amber-700">
  Nessuna firma: il rapportino verrà segnalato come non firmato.
</p>
```

- [ ] **Step 8: Creazione rapida del cliente dal telefono**

Creare `app/(tecnico)/rapportino/nuovo/page.tsx`: `richiediRuolo(['tecnico'])`, un form con ragione sociale, telefono, indirizzo, comune e descrizione del lavoro, che chiama `creaClienteRapido` e poi crea l'intervento del giorno assegnato al tecnico corrente con `stato = 'in_corso'`, reindirizzando su `/rapportino/[id]`. Serve per l'intervento non programmato: il tecnico è sul posto da un cliente che non è in anagrafica.

Dalla lista di oggi, aggiungere in fondo un pulsante fisso "Intervento non programmato" che porta a questa pagina.

Nota: la policy `clienti_inserimento` di Task 3 consente l'inserimento a qualsiasi utente autenticato proprio per questo caso; la modifica dei dati fiscali resta all'ufficio.

- [ ] **Step 9: Verificare a mano l'aggiornamento istantaneo**

Run: `npm run dev`, aprire `/rapportini` come ufficio in una finestra e chiudere un rapportino dal telefono simulato in un'altra.
Expected: la lista dell'ufficio si aggiorna senza ricaricare la pagina a mano, e il rapportino senza firma mostra il badge "Non firmato".

- [ ] **Step 10: Eseguire la suite completa e fare il commit**

Run: `npm run test && npm run test:e2e && npm run build`
Expected: tutto verde.

```bash
git add supabase/migrations/0004_realtime.sql components app
git commit -m "feat: refresh office list in realtime, flag unsigned reports, add walk-in jobs"
```

---

## Copertura della spec

| Requisito della spec | Task |
|---|---|
| Modello dati in italiano, dieci tabelle | 2 |
| Prezzi congelati nelle righe | 2, 8 |
| `prossima_manutenzione` generata dal database | 2, 13 |
| Costi visibili solo al titolare | 3, 14 |
| Seed di listino e dati di prova | 4 |
| Auth e instradamento per ruolo | 5 |
| Calcolo totali, margine, scadenza | 6 |
| Bozza locale e coda offline | 7, 10 |
| Chiusura idempotente del rapportino | 8 |
| Lista di oggi del tecnico | 9 |
| Rapportino a passi con timer, materiali, firma | 10 |
| Planning con trascinamento e creazione rapida | 11 |
| Lista da fatturare, dettaglio, PDF e CSV | 12 |
| Scadenzario con badge | 13 |
| Dashboard margini | 14 |
| PWA installabile, percorso end to end | 15 |
| Rapportino visibile in ufficio istantaneamente | 16 |
| Firma mancante consentita e segnalata | 16 |
| Cliente non in anagrafica, creazione dal telefono | 16 |
| Costi nascosti con revoca di tabella e concessione per colonna | 3 |
| Coerenza cliente-sede-impianto imposta dallo schema | 2 |
| Prezzi e costi non negativi | 2 |
| Export separato dallo stato `fatturato` | 12 |
| Margine segnalato come incompleto | 3, 14 |
| Bozza vecchia che non sorpassa le correzioni dell'ufficio | 8, 10 |
