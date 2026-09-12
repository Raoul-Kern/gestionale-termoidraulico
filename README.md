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

## Database

Le migrazioni stanno in `supabase/migrations` e si applicano con:

```bash
npx supabase link --project-ref <ref-del-progetto>
npx supabase db push
npx supabase db query --linked -f supabase/seed.sql   # solo su un progetto di prova
```

Il seed cancella e ricrea dati: non va eseguito dove ci sono rapportini veri.

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
