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

  it('scarta una data dal formato giusto ma inesistente', () => {
    expect(periodoDaParametri('2026-02-31', '2026-06-30', riferimento)).toEqual({
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
