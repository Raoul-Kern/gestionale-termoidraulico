# Gestionale termoidraulico

Web app per un'azienda termoidraulica: rapportini digitali per i tecnici in
furgone, planning giornaliero per l'ufficio, calcolo dei totali con export per il
commercialista, scadenzario delle manutenzioni e margini per il titolare.

## Tre ruoli, tre prime schermate

| Ruolo | Entra su | Cosa fa |
|---|---|---|
| Tecnico | `/oggi` | Apre e chiude i rapportini dal telefono, anche senza campo. |
| Ufficio | `/planning` | Assegna i lavori, controlla i rapportini chiusi, esporta per il commercialista. |
| Titolare | `/dashboard` | Legge ricavo, costi e margine per periodo e per tecnico. |

I permessi non vivono nel frontend: ogni tabella ha Row Level Security, e le
colonne di costo sono revocate a tutti i ruoli applicativi. I margini passano da
funzioni `security definer` che controllano il ruolo.

## Comandi

```bash
npm run dev        # sviluppo su http://localhost:3000
npm test           # test unitari, di componente e di permessi
npm run test:e2e   # percorso completo con Playwright
npm run build      # build di produzione
```

I test dei permessi e della chiusura parlano con il progetto Supabase vero:
servono le variabili in `.env.local`, copiabili da `.env.local.example`.

## Due progetti Supabase

| Progetto | Ref | A cosa serve |
|---|---|---|
| `Gestionali-idraulici` | `rityxqquwbiiusitofam` | Sviluppo e test. I test creano utenti e cancellano righe: qui è normale. |
| `gestionale-prod` | `phhikstqdwojblttbbut` | Produzione. Nessun test lo tocca, e le variabili `E2E_*` non devono mai nominarlo. |

La separazione non è prudenza astratta: con un solo progetto la produzione si
riempie di clienti e tecnici inventati dai test, e diventa illeggibile.

Le migrazioni stanno in `supabase/migrations`:

```bash
npx supabase link --project-ref <ref>   # attenzione: cambia il bersaglio di db push
npx supabase db push
```

Due file di dati, con scopi diversi:

- `supabase/listino.sql` — solo i materiali. Va bene anche in produzione.
- `supabase/seed.sql` — listino più clienti, sedi e impianti inventati. Solo in
  sviluppo.

## Primo utente titolare

Registrare l'utente da `/login` non basta: il ruolo predefinito è `tecnico`.

```bash
npx supabase db query --linked "
  update utenti set ruolo = 'titolare' where id = (
    select id from auth.users where email = 'titolare@azienda.it'
  );
"
```

## Tariffe

Le tre tariffe orarie di vendita stanno nella riga unica della tabella
`impostazioni` e le modifica il titolare. Le righe dei rapportini già chiusi non
cambiano: copiano il prezzo al momento della chiusura.

## Fatturazione

L'applicazione non emette fatture. Produce una stampa per il cliente e un CSV
per il commercialista, che apre in Excel italiano senza conversioni. Lo stato
`fatturato` lo imposta l'ufficio a mano, dopo che la fattura esiste davvero.

## Prototipo

In `prototipo/` resta la pagina statica usata per decidere ergonomia e layout
prima di scrivere l'applicazione. Ha un deploy separato e non fa parte del
prodotto.
