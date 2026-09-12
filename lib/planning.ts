/** Griglia del tabellone: fasce orarie e identificativi delle celle. */

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

// L'id utente contiene trattini, quindi il separatore dev'essere un carattere
// che non compare in un UUID.
const SEPARATORE = '@'

export function idCella(tecnicoId: string, fascia: string): string {
  return `${tecnicoId}${SEPARATORE}${fascia}`
}

export function leggiCella(id: string): { tecnicoId: string; fascia: string } {
  const taglio = id.lastIndexOf(SEPARATORE)
  return { tecnicoId: id.slice(0, taglio), fascia: id.slice(taglio + 1) }
}
