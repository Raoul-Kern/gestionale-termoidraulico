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
    expect(leggiCella(idCella('tec-1', '09:00'))).toEqual({ tecnicoId: 'tec-1', fascia: '09:00' })
  })

  it('sopravvive a un id utente con trattini', () => {
    const uuid = '0f1e2d3c-4b5a-6789-abcd-ef0123456789'
    expect(leggiCella(idCella(uuid, '17:00'))).toEqual({ tecnicoId: uuid, fascia: '17:00' })
  })
})
