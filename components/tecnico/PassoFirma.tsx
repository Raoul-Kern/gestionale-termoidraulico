'use client'

import { useId } from 'react'
import { formattaEuro } from '@/lib/calcoli'
import type { BozzaRapportino } from '@/lib/bozza'
import { TelaFirma } from './TelaFirma'

export function PassoFirma({
  note,
  firmatario,
  firmaDataUrl,
  totale,
  onCambio,
}: {
  note: string
  firmatario: string
  firmaDataUrl: string | null
  totale: number
  onCambio: (modifica: Partial<BozzaRapportino>) => void
}) {
  const idNote = useId()
  const idFirmatario = useId()

  return (
    <section className="flex flex-col gap-4">
      <label htmlFor={idNote} className="flex flex-col gap-1 text-sm text-slate-600">
        Note
        <textarea
          id={idNote}
          value={note}
          onChange={(evento) => onCambio({ note: evento.target.value })}
          placeholder="Cosa è stato fatto"
          className="min-h-24 rounded-xl border border-slate-300 bg-white p-4 text-base text-slate-900"
        />
      </label>

      <label htmlFor={idFirmatario} className="flex flex-col gap-1 text-sm text-slate-600">
        Firmato da
        <input
          id={idFirmatario}
          type="text"
          value={firmatario}
          onChange={(evento) => onCambio({ firmatario: evento.target.value })}
          autoComplete="off"
          className="h-14 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        Firma del cliente
        <TelaFirma
          valore={firmaDataUrl}
          onCambio={(nuovaFirma) => onCambio({ firmaDataUrl: nuovaFirma })}
        />
      </div>

      {!firmaDataUrl && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Senza firma il rapportino si chiude comunque, ma l&apos;ufficio lo vede segnalato come
          non firmato.
        </p>
      )}

      <div className="flex items-baseline justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-600">Da leggere al cliente</span>
        <span className="text-xl font-semibold tabular-nums">{formattaEuro(totale)}</span>
      </div>
    </section>
  )
}
