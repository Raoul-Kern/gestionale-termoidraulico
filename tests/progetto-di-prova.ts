/**
 * Credenziali del progetto contro cui girano i test.
 *
 * Volutamente separate da quelle dell'applicazione. I test creano utenti, li
 * lasciano lì e cancellano righe con la chiave service_role, che scavalca ogni
 * policy: se leggessero `NEXT_PUBLIC_SUPABASE_URL`, il giorno in cui quel file
 * punta alla produzione la svuoterebbero senza che nessuno se ne accorga prima.
 *
 * Le variabili sono obbligatorie e non hanno alcun ripiego sulle altre: un
 * ripiego comodo è esattamente ciò che riporterebbe il problema.
 */

const MANCANTI: string[] = []

function obbligatoria(nome: string): string {
  const valore = process.env[nome]
  if (!valore) {
    MANCANTI.push(nome)
    return ''
  }
  return valore
}

export const urlDiProva = obbligatoria('E2E_SUPABASE_URL')
export const anonDiProva = obbligatoria('E2E_SUPABASE_ANON_KEY')
export const serviceDiProva = obbligatoria('E2E_SUPABASE_SERVICE_ROLE_KEY')

if (MANCANTI.length > 0) {
  throw new Error(
    [
      `Test fermati: mancano ${MANCANTI.join(', ')}.`,
      'Vanno indicate in .env.local e devono puntare a un progetto Supabase',
      'usa e getta, mai a quello che contiene i rapportini veri.',
      'Il modello è in .env.local.example.',
    ].join(' '),
  )
}

/** Salvaguardia esplicita: il progetto di produzione non è mai un bersaglio. */
const produzione = process.env.SUPABASE_PROGETTO_PRODUZIONE
if (produzione && urlDiProva.includes(produzione)) {
  throw new Error(
    `Test fermati: E2E_SUPABASE_URL punta al progetto di produzione (${produzione}).`,
  )
}
