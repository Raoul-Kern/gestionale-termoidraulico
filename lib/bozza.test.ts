import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  accodaInvio,
  bozzaVuota,
  elaboraCoda,
  eliminaBozza,
  leggiBozza,
  leggiCoda,
  minutiTimer,
  salvaBozza,
  svuotaCoda,
} from './bozza'

beforeEach(async () => {
  const { clear } = await import('idb-keyval')
  await clear()
})

describe('bozza locale', () => {
  it('salva e rilegge una bozza per intervento', async () => {
    const bozza = bozzaVuota('int-1')
    bozza.note = 'Sostituita valvola'
    bozza.ore.push({ tipo: 'ordinario', minuti: 60, prezzo_orario: 40 })
    await salvaBozza(bozza)

    const riletta = await leggiBozza('int-1')
    expect(riletta?.note).toBe('Sostituita valvola')
    expect(riletta?.ore).toHaveLength(1)
  })

  it('non confonde le bozze di due interventi', async () => {
    await salvaBozza({ ...bozzaVuota('int-1'), note: 'primo' })
    await salvaBozza({ ...bozzaVuota('int-2'), note: 'secondo' })

    expect((await leggiBozza('int-1'))?.note).toBe('primo')
    expect((await leggiBozza('int-2'))?.note).toBe('secondo')
  })

  it('restituisce null per un intervento senza bozza', async () => {
    expect(await leggiBozza('mai-visto')).toBeNull()
  })

  it('elimina la bozza', async () => {
    await salvaBozza(bozzaVuota('int-1'))
    await eliminaBozza('int-1')
    expect(await leggiBozza('int-1')).toBeNull()
  })

  it('aggiorna l orario di salvataggio a ogni scrittura', async () => {
    const bozza = bozzaVuota('int-1')
    bozza.aggiornataIl = 0
    await salvaBozza(bozza)

    const riletta = await leggiBozza('int-1')
    expect(riletta!.aggiornataIl).toBeGreaterThan(0)
  })
})

describe('coda di invio', () => {
  it('accoda la bozza e la conserva in coda', async () => {
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'da inviare' })

    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].interventoId).toBe('int-1')
  })

  it('accodare due volte lo stesso intervento lascia una sola voce aggiornata', async () => {
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'prima versione' })
    await accodaInvio({ ...bozzaVuota('int-1'), note: 'seconda versione' })

    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].note).toBe('seconda versione')
  })

  it('svuota la coda di un singolo intervento senza toccare gli altri', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-2'))
    await svuotaCoda('int-1')

    const coda = await leggiCoda()
    expect(coda.map((b) => b.interventoId)).toEqual(['int-2'])
  })

  it('elabora la coda e la svuota quando l invio riesce', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-2'))

    const invia = vi.fn().mockResolvedValue(undefined)
    const esito = await elaboraCoda(invia)

    expect(invia).toHaveBeenCalledTimes(2)
    expect(esito).toEqual({ inviati: 2, rimasti: 0, rifiutati: 0 })
    expect(await leggiCoda()).toHaveLength(0)
  })

  it('tiene in coda le bozze il cui invio fallisce per la rete', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-2'))

    const invia = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
    const esito = await elaboraCoda(invia)

    expect(esito).toEqual({ inviati: 1, rimasti: 1, rifiutati: 0 })
    const coda = await leggiCoda()
    expect(coda).toHaveLength(1)
    expect(coda[0].interventoId).toBe('int-2')
  })

  it('una seconda elaborazione riprova solo ciò che era rimasto', async () => {
    await accodaInvio(bozzaVuota('int-1'))
    await elaboraCoda(vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    const invia = vi.fn().mockResolvedValue(undefined)
    const esito = await elaboraCoda(invia)

    expect(invia).toHaveBeenCalledTimes(1)
    expect(esito).toEqual({ inviati: 1, rimasti: 0, rifiutati: 0 })
  })

  it('toglie dalla coda la bozza rifiutata perché l ufficio ha già corretto', async () => {
    await accodaInvio(bozzaVuota('int-1'))

    const invia = vi
      .fn()
      .mockRejectedValue(new Error('Rapportino già modificato in ufficio il 2026-09-12'))
    const esito = await elaboraCoda(invia)

    // Riprovare all'infinito una bozza che il server rifiuterà sempre è peggio
    // che fermarsi: la coda si svuota e il tecnico viene avvisato.
    expect(esito).toEqual({ inviati: 0, rimasti: 0, rifiutati: 1 })
    expect(await leggiCoda()).toHaveLength(0)
  })

  it('elimina la bozza locale solo quando l invio è andato a buon fine', async () => {
    await salvaBozza(bozzaVuota('int-1'))
    await accodaInvio(bozzaVuota('int-1'))

    await elaboraCoda(vi.fn().mockRejectedValue(new Error('Failed to fetch')))
    expect(await leggiBozza('int-1')).not.toBeNull()

    await elaboraCoda(vi.fn().mockResolvedValue(undefined))
    expect(await leggiBozza('int-1')).toBeNull()
  })
})

describe('minutiTimer', () => {
  it('restituisce zero se il timer non e partito', () => {
    expect(minutiTimer(null)).toBe(0)
  })

  it('calcola i minuti dal timestamp di avvio, non da un contatore in memoria', () => {
    const avvio = Date.UTC(2026, 8, 12, 9, 0, 0)
    const adesso = Date.UTC(2026, 8, 12, 10, 31, 0)
    expect(minutiTimer(avvio, adesso)).toBe(91)
  })

  it('arrotonda per difetto i secondi', () => {
    const avvio = Date.UTC(2026, 8, 12, 9, 0, 0)
    expect(minutiTimer(avvio, avvio + 119_000)).toBe(1)
  })

  it('non restituisce minuti negativi se l orologio del telefono torna indietro', () => {
    const avvio = Date.UTC(2026, 8, 12, 9, 0, 0)
    expect(minutiTimer(avvio, avvio - 600_000)).toBe(0)
  })
})
