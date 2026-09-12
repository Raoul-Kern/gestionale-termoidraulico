'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  accodaInvio,
  bozzaVuota,
  eliminaBozza,
  leggiBozza,
  salvaBozza,
  type BozzaRapportino,
} from '@/lib/bozza'
import { calcolaTotali, formattaEuro } from '@/lib/calcoli'
import { chiudiRapportino } from '@/app/(tecnico)/rapportino/azioni'
import { PassoOre, type Tariffe } from './PassoOre'
import { PassoMateriali, type MaterialeListino } from './PassoMateriali'
import { PassoFirma } from './PassoFirma'

const PASSI = ['Ore', 'Materiali', 'Note e firma'] as const

export function FormRapportino({
  interventoId,
  cliente,
  indirizzo,
  descrizione,
  listino,
  tariffe,
}: {
  interventoId: string
  cliente: string
  indirizzo: string
  descrizione: string
  listino: MaterialeListino[]
  tariffe: Tariffe
}) {
  const router = useRouter()
  const [bozza, setBozza] = useState<BozzaRapportino | null>(null)
  const [passo, setPasso] = useState(0)
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const [inCorso, avvia] = useTransition()

  useEffect(() => {
    void leggiBozza(interventoId).then((salvata) => setBozza(salvata ?? bozzaVuota(interventoId)))
  }, [interventoId])

  function aggiorna(modifica: Partial<BozzaRapportino>) {
    setBozza((precedente) => {
      if (!precedente) return precedente
      const nuova = { ...precedente, ...modifica }
      void salvaBozza(nuova)
      return nuova
    })
  }

  if (!bozza) {
    return <p className="p-4 text-slate-500">Carico la bozza…</p>
  }

  const totali = calcolaTotali(bozza.ore, bozza.materiali)
  const senzaOre = bozza.ore.length === 0

  function chiudi() {
    avvia(async () => {
      try {
        await chiudiRapportino(bozza!)
        await eliminaBozza(interventoId)
        router.push('/oggi')
      } catch (errore) {
        const testo = errore instanceof Error ? errore.message : ''

        // Un rapportino già corretto in ufficio verrà rifiutato a ogni tentativo:
        // rimetterlo in coda lo farebbe riprovare per sempre.
        if (/già modificato in ufficio/i.test(testo)) {
          setMessaggio(
            'L’ufficio ha già corretto questo rapportino: la tua copia non è stata inviata. Chiama l’ufficio prima di rifarlo.',
          )
          return
        }

        await accodaInvio(bozza!)
        setMessaggio(
          'Rete assente: rapportino messo in coda, parte appena torna il segnale.',
        )
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="font-[family-name:var(--font-titoli)] text-2xl font-semibold">{cliente}</h1>
        <p className="text-sm text-slate-600">{indirizzo}</p>
        <p className="mt-1 text-base">{descrizione}</p>
      </header>

      <nav className="flex gap-2" aria-label="Passi del rapportino">
        {PASSI.map((etichetta, indice) => (
          <button
            key={etichetta}
            type="button"
            onClick={() => setPasso(indice)}
            aria-pressed={passo === indice}
            className={
              passo === indice
                ? 'h-12 flex-1 rounded-xl bg-[#27705c] text-sm font-medium text-white'
                : 'h-12 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700'
            }
          >
            {etichetta}
          </button>
        ))}
      </nav>

      {passo === 0 && (
        <PassoOre
          ore={bozza.ore}
          timerAvviatoIl={bozza.timerAvviatoIl}
          tariffe={tariffe}
          onCambio={(ore) => aggiorna({ ore })}
          onTimer={(timerAvviatoIl) => aggiorna({ timerAvviatoIl })}
        />
      )}

      {passo === 1 && (
        <PassoMateriali
          listino={listino}
          righe={bozza.materiali}
          onCambio={(materiali) => aggiorna({ materiali })}
        />
      )}

      {passo === 2 && (
        <PassoFirma
          note={bozza.note}
          firmatario={bozza.firmatario}
          firmaDataUrl={bozza.firmaDataUrl}
          totale={totali.totale}
          onCambio={aggiorna}
        />
      )}

      {messaggio && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {messaggio}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-600">Totale intervento</span>
          <span className="font-[family-name:var(--font-titoli)] text-2xl font-semibold tabular-nums">
            {formattaEuro(totali.totale)}
          </span>
        </div>

        {passo < PASSI.length - 1 ? (
          <button
            type="button"
            onClick={() => setPasso(passo + 1)}
            className="h-14 w-full rounded-xl bg-slate-900 text-base font-medium text-white"
          >
            Avanti
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={chiudi}
              disabled={inCorso || senzaOre}
              className="h-14 w-full rounded-xl bg-[#27705c] text-base font-medium text-white disabled:opacity-60"
            >
              {inCorso ? 'Invio…' : 'Chiudi rapportino'}
            </button>
            {senzaOre && (
              <p className="mt-2 text-xs text-slate-500">
                Aggiungi almeno un tempo di lavoro per chiudere.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
