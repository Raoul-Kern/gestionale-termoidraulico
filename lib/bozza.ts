/**
 * Bozza del rapportino sul telefono del tecnico e coda di invio.
 *
 * Tutto sta in IndexedDB: in cantina e nei locali tecnici il campo manca, e il
 * rapportino deve chiudersi lo stesso. Quello che il tecnico tocca viene salvato
 * a ogni modifica; la chiusura, se la rete non c'è, finisce in coda e riparte al
 * ritorno del segnale.
 */

import { del, get, set } from 'idb-keyval'
import type { TipoOra } from './calcoli'

export type RigaOreBozza = {
  tipo: TipoOra
  minuti: number
  prezzo_orario: number
}

export type RigaMaterialeBozza = {
  materiale_id: string | null
  descrizione: string
  quantita: number
  prezzo_vendita: number
}

export type BozzaRapportino = {
  interventoId: string
  ore: RigaOreBozza[]
  materiali: RigaMaterialeBozza[]
  note: string
  firmatario: string
  firmaDataUrl: string | null
  /** Istante di avvio del timer, non un conteggio: sopravvive al blocco schermo. */
  timerAvviatoIl: number | null
  /** Ultimo salvataggio locale. Il server lo usa per rifiutare una bozza sorpassata. */
  aggiornataIl: number
}

const chiaveBozza = (interventoId: string) => `bozza:${interventoId}`
const CHIAVE_CODA = 'coda-rapportini'

/**
 * Un invio rifiutato perché l'ufficio ha già corretto il rapportino non va
 * riprovato: il server lo rifiuterebbe uguale a ogni tentativo.
 */
const RIFIUTO_DEFINITIVO = /già modificato in ufficio/i

export function bozzaVuota(interventoId: string): BozzaRapportino {
  return {
    interventoId,
    ore: [],
    materiali: [],
    note: '',
    firmatario: '',
    firmaDataUrl: null,
    timerAvviatoIl: null,
    aggiornataIl: Date.now(),
  }
}

export async function leggiBozza(interventoId: string): Promise<BozzaRapportino | null> {
  return (await get<BozzaRapportino>(chiaveBozza(interventoId))) ?? null
}

export async function salvaBozza(bozza: BozzaRapportino): Promise<void> {
  await set(chiaveBozza(bozza.interventoId), { ...bozza, aggiornataIl: Date.now() })
}

export async function eliminaBozza(interventoId: string): Promise<void> {
  await del(chiaveBozza(interventoId))
}

export async function leggiCoda(): Promise<BozzaRapportino[]> {
  return (await get<BozzaRapportino[]>(CHIAVE_CODA)) ?? []
}

export async function accodaInvio(bozza: BozzaRapportino): Promise<void> {
  const coda = await leggiCoda()
  const senzaDuplicato = coda.filter((voce) => voce.interventoId !== bozza.interventoId)

  senzaDuplicato.push({ ...bozza, aggiornataIl: Date.now() })
  await set(CHIAVE_CODA, senzaDuplicato)
}

export async function svuotaCoda(interventoId: string): Promise<void> {
  const coda = await leggiCoda()
  await set(
    CHIAVE_CODA,
    coda.filter((voce) => voce.interventoId !== interventoId),
  )
}

export type EsitoCoda = {
  inviati: number
  /** Ancora in coda: riproveranno al prossimo ritorno di rete. */
  rimasti: number
  /** Tolti dalla coda senza essere inviati: riprovarli non cambierebbe nulla. */
  rifiutati: number
}

export async function elaboraCoda(
  invia: (bozza: BozzaRapportino) => Promise<void>,
): Promise<EsitoCoda> {
  const coda = await leggiCoda()
  const rimaste: BozzaRapportino[] = []
  let inviati = 0
  let rifiutati = 0

  for (const bozza of coda) {
    try {
      await invia(bozza)
      inviati += 1
      await eliminaBozza(bozza.interventoId)
    } catch (errore) {
      const messaggio = errore instanceof Error ? errore.message : String(errore)

      if (RIFIUTO_DEFINITIVO.test(messaggio)) {
        rifiutati += 1
        continue
      }

      rimaste.push(bozza)
    }
  }

  await set(CHIAVE_CODA, rimaste)
  return { inviati, rimasti: rimaste.length, rifiutati }
}

export function minutiTimer(avviatoIl: number | null, adesso: number = Date.now()): number {
  if (!avviatoIl) return 0

  // Un orologio che torna indietro (cambio d'ora, sincronizzazione del telefono)
  // non deve produrre minuti negativi da sommare alle ore.
  return Math.max(0, Math.floor((adesso - avviatoIl) / 60_000))
}
