import { describe, expect, it } from 'vitest'
import { generaCsv, type RigaExport } from './export'

const riga: RigaExport = {
  numero: 'RAP-2026-0001',
  data: '2026-09-12',
  cliente: 'Panificio Rossi S.r.l.',
  partita_iva: '01234567890',
  descrizione: 'Sostituzione valvola',
  ore: 2,
  importo_ore: 80,
  importo_materiali: 33.1,
  totale: 113.1,
}

describe('generaCsv', () => {
  it('scrive l intestazione separata da punto e virgola', () => {
    expect(generaCsv([riga]).split('\n')[0]).toBe(
      'Numero;Data;Cliente;Partita IVA;Descrizione;Ore;Importo ore;Importo materiali;Totale',
    )
  })

  it('usa la virgola come separatore decimale', () => {
    const csv = generaCsv([riga])
    expect(csv).toContain('113,10')
    expect(csv).toContain('33,10')
  })

  it('protegge i campi che contengono il separatore', () => {
    expect(generaCsv([{ ...riga, cliente: 'Rossi; Bianchi S.n.c.' }])).toContain(
      '"Rossi; Bianchi S.n.c."',
    )
  })

  it('raddoppia le virgolette interne', () => {
    expect(generaCsv([{ ...riga, descrizione: 'Valvola da 1/2" sostituita' }])).toContain(
      '"Valvola da 1/2"" sostituita"',
    )
  })

  it('protegge anche i campi che contengono un a capo', () => {
    const csv = generaCsv([{ ...riga, descrizione: 'Prima riga\nSeconda riga' }])
    expect(csv).toContain('"Prima riga\nSeconda riga"')
  })

  it('lascia vuota la partita IVA assente invece di scrivere null', () => {
    const csv = generaCsv([{ ...riga, partita_iva: null }])
    expect(csv).not.toContain('null')
    expect(csv.split('\n')[1].split(';')[3]).toBe('')
  })

  it('scrive una riga per rapportino', () => {
    expect(generaCsv([riga, { ...riga, numero: 'RAP-2026-0002' }]).trim().split('\n')).toHaveLength(3)
  })

  it('restituisce solo l intestazione su elenco vuoto', () => {
    expect(generaCsv([]).trim().split('\n')).toHaveLength(1)
  })
})
