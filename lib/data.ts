/**
 * Date di calendario nel fuso dell'azienda.
 *
 * Un `new Date().toISOString()` restituisce il giorno UTC: alle 00:30 di Roma
 * è ancora il giorno prima, e il tabellone aprirebbe su ieri. Qui le date sono
 * giorni di calendario italiani, non istanti.
 */

const FUSO = 'Europe/Rome'

const formatoIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatoEsteso = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function dataDiOggi(adesso: Date = new Date()): string {
  return formatoIso.format(adesso)
}

export function spostaGiorno(data: string, passo: number): string {
  // Mezzogiorno UTC come ancora: spostarsi di un giorno non inciampa nei
  // cambi di ora legale, che avvengono di notte.
  const ancora = new Date(`${data}T12:00:00Z`)
  ancora.setUTCDate(ancora.getUTCDate() + passo)
  return ancora.toISOString().slice(0, 10)
}

export function inItaliano(data: string): string {
  return formatoEsteso.format(new Date(`${data}T00:00:00Z`))
}
