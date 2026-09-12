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

  it('segnala il margine incompleto quando manca la tariffa di costo del tecnico', () => {
    const conCosto = calcolaTotali([{ tipo: 'ordinario', minuti: 60, prezzo_orario: 40, costo_orario: 22 }], [])
    const senzaCosto = calcolaTotali([{ tipo: 'ordinario', minuti: 60, prezzo_orario: 40, costo_orario: 0 }], [])

    expect(conCosto.margineIncompleto).toBe(false)
    expect(senzaCosto.margineIncompleto).toBe(true)
  })

  it('considera incompleto un rapportino in cui una sola riga di ore non ha costo', () => {
    const totali = calcolaTotali(
      [
        { tipo: 'viaggio', minuti: 30, prezzo_orario: 30, costo_orario: 22 },
        { tipo: 'ordinario', minuti: 60, prezzo_orario: 40, costo_orario: 0 },
      ],
      [],
    )
    expect(totali.margineIncompleto).toBe(true)
  })
})

describe('formattaEuro', () => {
  it('arrotonda a due decimali in presentazione', () => {
    expect(formattaEuro(113.1)).toBe('113,10 €')
    expect(formattaEuro(0)).toBe('0,00 €')
  })

  it('usa il punto come separatore delle migliaia', () => {
    expect(formattaEuro(4180)).toBe('4.180,00 €')
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

  it('non cambia esito con un orario di sera, che il fuso potrebbe spostare di un giorno', () => {
    const sera = new Date('2026-09-12T23:30:00+02:00')
    expect(statoScadenza('2026-09-12', sera)).toBe('in_scadenza')
  })
})
