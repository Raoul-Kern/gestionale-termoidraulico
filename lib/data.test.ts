import { describe, expect, it } from 'vitest'
import { dataDiOggi, spostaGiorno, inItaliano } from './data'

describe('dataDiOggi', () => {
  it('usa il fuso italiano, non UTC', () => {
    // Mezzanotte e mezza a Roma è ancora il giorno prima in UTC: il tabellone
    // non deve aprire sul giorno sbagliato.
    const notte = new Date('2026-09-12T22:30:00Z')
    expect(dataDiOggi(notte)).toBe('2026-09-13')
  })

  it('resta sul giorno corrente in pieno pomeriggio', () => {
    expect(dataDiOggi(new Date('2026-09-13T14:00:00Z'))).toBe('2026-09-13')
  })

  it('gestisce l ora legale', () => {
    // A luglio l'Italia è avanti di due ore.
    expect(dataDiOggi(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15')
  })
})

describe('spostaGiorno', () => {
  it('avanza e torna indietro di un giorno', () => {
    expect(spostaGiorno('2026-09-13', 1)).toBe('2026-09-14')
    expect(spostaGiorno('2026-09-13', -1)).toBe('2026-09-12')
  })

  it('scavalca il cambio di mese', () => {
    expect(spostaGiorno('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('non salta un giorno al cambio di ora legale', () => {
    expect(spostaGiorno('2026-10-25', -1)).toBe('2026-10-24')
  })
})

describe('inItaliano', () => {
  it('scrive giorno e mese per esteso', () => {
    expect(inItaliano('2026-09-13')).toBe('domenica 13 settembre')
  })
})
