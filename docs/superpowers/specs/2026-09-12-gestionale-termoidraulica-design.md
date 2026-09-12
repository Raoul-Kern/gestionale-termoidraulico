# Gestionale termoidraulico — design MVP

Data: 2026-09-12
Stato: approvato

## Obiettivo

Eliminare i rapportini di carta in un'azienda termoidraulica da circa 1 milione di
fatturato, con 5-10 furgoni. Tre risultati misurabili:

1. Il tecnico chiude il rapportino sul telefono prima di ripartire dal cantiere,
   e l'ufficio lo vede subito.
2. Le ore e i materiali di ogni intervento sono tracciati per riga, con i prezzi
   congelati al momento dell'uso.
3. L'ufficio produce la bozza di fattura senza ridigitare nulla, e il titolare
   legge il margine per periodo e per tecnico.

Fuori scope per l'MVP: fattura elettronica XML verso lo SdI, integrazione con
gestionali esterni, magazzino con giacenze, contabilità.

## Decisioni prese

| Tema | Scelta | Motivo |
|------|--------|--------|
| Backend | Supabase (Postgres gestito, Auth, Realtime, Storage) | Nessun server da mantenere; il rapportino arriva in ufficio via Realtime; RLS come unico punto di verità dei permessi. |
| ORM | Nessuno: client Supabase tipizzato | Prisma duplicherebbe lo schema e aggirerebbe RLS, costringendo a riscrivere l'autorizzazione in ogni route. |
| Fatturazione | Export PDF + CSV per il commercialista | Nessun obbligo di conformità SdI dentro l'MVP. |
| Offline | PWA con bozza locale in IndexedDB e coda di invio | Locali tecnici e cantine senza campo sono la norma. |
| Frontend | Next.js App Router, Tailwind, shadcn/ui | Un solo repo, Server Components per le liste, client components solo dove serve il tocco. |
| Lingua dello schema | Italiano, tabelle e colonne | Richiesta esplicita; il vocabolario dell'azienda resta leggibile nel database. |

## Architettura

Un solo progetto Next.js, tre gruppi di route separati per ruolo:

- `app/(tecnico)/` — mobile first, pulsanti grandi, pochi tocchi.
- `app/(ufficio)/` — desktop, tabelloni e liste dense.
- `app/(titolare)/` — dashboard con costi e margini.

L'autorizzazione non vive nel frontend. Ogni tabella ha Row Level Security; il
ruolo sta in `utenti.ruolo` ed è leggibile dalle policy tramite una funzione
`ruolo_corrente()`. Il layout di gruppo reindirizza chi non ha il ruolo giusto,
ma è una comodità di navigazione, non una barriera di sicurezza.

I costi (tariffa di costo del tecnico, prezzo di acquisto dei materiali) stanno in
colonne distinte dai prezzi di vendita. Le policy per il ruolo `tecnico` e
`ufficio` non espongono quelle colonne: il margine è visibile solo al titolare.

## Modello dati

Dieci tabelle, nove di dominio più `impostazioni`. I nomi di tabelle, colonne e valori degli enum sono in italiano.
Ogni tabella ha `id uuid`, `creato_il`, `aggiornato_il`.

- **utenti** — estende `auth.users`. `nome`, `ruolo` (`tecnico|ufficio|titolare`),
  `tariffa_costo_oraria` (costo aziendale del tecnico), `colore` per il tabellone,
  `attivo`.
- **clienti** — `ragione_sociale`, `partita_iva`, `codice_fiscale`, `telefono`,
  `email`, `note`.
- **sedi** — un cliente può avere più indirizzi. `cliente_id`, `etichetta`,
  `indirizzo`, `comune`, `cap`, `note_accesso`.
- **impianti** — `sede_id`, `tipo` (`caldaia|condizionatore|pompa_calore|altro`),
  `marca`, `modello`, `matricola`, `ultima_manutenzione`, `intervallo_mesi`
  (default 12), `prossima_manutenzione` colonna generata, `attivo`.
- **materiali** — listino. `codice`, `descrizione`, `unita`, `prezzo_acquisto`,
  `prezzo_vendita`, `attivo`.
- **interventi** — il lavoro programmato. `cliente_id`, `sede_id`, `tecnico_id`,
  `data`, `ora_inizio`, `durata_prevista_minuti`, `descrizione`, `priorita`
  (`bassa|normale|urgente`), `stato` (`programmato|in_corso|chiuso|annullato`),
  `impianto_id` opzionale.
- **rapportini** — uno per intervento chiuso. `intervento_id` unico, `tecnico_id`,
  `note`, `firma_url`, `firmatario`, `chiuso_il`, `stato_fatturazione`
  (`da_fatturare|fatturato|non_fatturabile`). Non contiene importi: i prezzi
  stanno nelle righe.
- **rapportino_ore** — righe. `rapportino_id`, `tipo`
  (`viaggio|ordinario|urgenza`), `minuti`, `prezzo_orario` copiato,
  `costo_orario` copiato.
- **rapportino_materiali** — righe. `rapportino_id`, `materiale_id`,
  `descrizione` copiata, `quantita`, `prezzo_vendita` copiato,
  `prezzo_acquisto` copiato.

### Due invarianti

**Prezzi congelati.** Le righe del rapportino copiano prezzo e costo al momento
dell'uso. Un aumento di listino non deve riscrivere il valore di interventi già
eseguiti. `materiale_id` resta come riferimento per le statistiche, ma non è la
fonte del prezzo.

**Scadenza calcolata dal database.** `prossima_manutenzione` è una colonna
generata da `ultima_manutenzione + intervallo_mesi`. Il badge rosso o giallo del
scadenzario è quindi una query ordinata, non logica applicativa duplicata in più
schermate.

### Tariffe

Le tariffe di vendita per tipo di ora stanno in una tabella di configurazione a
riga singola `impostazioni` (`prezzo_ora_ordinaria`, `prezzo_ora_viaggio`,
`prezzo_ora_urgenza`). Il rapportino le copia alla creazione della riga.

## Flussi

### Rapportino mobile (tecnico)

`/(tecnico)/oggi` elenca gli interventi del giorno assegnati al tecnico, a card
grandi con cliente, indirizzo, priorità e un pulsante per aprire il rapportino.

`/(tecnico)/rapportino/[interventoId]` procede a passi: ore, materiali, note,
firma. Ogni tocco salva la bozza in IndexedDB con la chiave dell'intervento. Il
passo finale, "Chiudi rapportino", accoda l'invio; se la rete manca la bozza
resta in coda e parte al ritorno della connettività.

Il timer registra un timestamp di inizio sul dispositivo e calcola i minuti alla
lettura, invece di far avanzare un contatore in memoria: così sopravvive al blocco
schermo e alla chiusura della scheda. Resta sempre possibile digitare i minuti a
mano.

I materiali si cercano su un listino precaricato in locale (poche migliaia di
righe), con ricerca testuale immediata e quantità a più/meno.

La firma è un `<canvas>` con pointer events, esportata in PNG e caricata su
Supabase Storage in un bucket privato; il rapportino conserva il percorso.

### Planning (ufficio)

`/(ufficio)/planning` mostra il giorno scelto come tabellone: una colonna per
tecnico attivo, le fasce orarie come righe. Gli interventi si spostano con
`@dnd-kit`, e lo spostamento aggiorna `tecnico_id` e `ora_inizio`. Un dialog crea
l'intervento con cliente, sede, descrizione e priorità. La creazione rapida di un
cliente è disponibile dallo stesso dialog.

### Rapportini e export (ufficio)

`/(ufficio)/rapportini` elenca i rapportini chiusi con stato `da_fatturare`, con
cliente, data, tecnico e totale. Il dettaglio mostra il calcolo riga per riga:
somma delle ore per tariffa, somma dei materiali, totale intervento. Il pulsante
di export produce un PDF riassuntivo per il cliente e un CSV per il
commercialista, e marca il rapportino come `fatturato`.

### Scadenzario (ufficio)

`/(ufficio)/scadenzario` elenca gli impianti ordinati per `prossima_manutenzione`,
con badge rosso per le scadenze passate e giallo entro trenta giorni, e il
contatto del cliente accanto per il richiamo.

### Dashboard (titolare)

`/(titolare)/dashboard` mostra per il periodo scelto: ricavo, costo del lavoro,
costo dei materiali, margine assoluto e percentuale, con ripartizione per tecnico
e per tipo di ora.

## Calcoli

Una sola funzione pura per intervento, usata sia dall'ufficio sia dalla
dashboard:

```
ricavo_ore      = Σ (minuti / 60 × prezzo_orario)
costo_ore       = Σ (minuti / 60 × costo_orario)
ricavo_materiali = Σ (quantita × prezzo_vendita)
costo_materiali  = Σ (quantita × prezzo_acquisto)
totale_intervento = ricavo_ore + ricavo_materiali
margine           = totale_intervento − costo_ore − costo_materiali
```

Gli importi si arrotondano a due decimali solo in presentazione. In database gli
importi sono `numeric(10,2)` e le quantità `numeric(10,3)`.

## Errori

- **Invio rapportino senza rete.** La bozza resta in IndexedDB, la schermata
  mostra "in attesa di invio" e la coda riprova all'evento `online`. Nessun dato
  perso, nessuna schermata di errore bloccante.
- **Doppio invio.** `intervento_id` è unico su `rapportini`; un secondo invio
  della stessa bozza aggiorna invece di duplicare.
- **Firma mancante.** Consentita, ma il rapportino resta marcato come non
  firmato e l'ufficio lo vede segnalato: bloccare il tecnico in cantiere è peggio.
- **Cliente non in anagrafica.** Creazione rapida dal rapportino con sola
  ragione sociale e indirizzo; l'ufficio completa i dati fiscali dopo.

## Test

Vitest sui calcoli e sulla coda offline, le due parti dove un errore costa soldi:
totale intervento, margine, scadenza manutenzione, comportamento della coda con
rete assente e ritorno di rete, idempotenza del doppio invio.

Playwright su un percorso completo: apri il rapportino, aggiungi ore e materiale,
firma, chiudi, verifica che compaia nella lista dell'ufficio col totale corretto.

Test di RLS che interrogano il database come tecnico e come ufficio e verificano
che le colonne di costo non tornino.

## Ordine di costruzione

1. Schema, RLS, seed di listino e dati di prova.
2. Auth e instradamento per ruolo.
3. Rapportino mobile, inclusa la coda offline.
4. Planning desktop.
5. Rapportini e export.
6. Scadenzario.
7. Dashboard margini.
