'use client'

import { useId, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formattaEuro } from '@/lib/calcoli'
import type { RigaMaterialeBozza } from '@/lib/bozza'

export type MaterialeListino = {
  id: string
  codice: string
  descrizione: string
  unita: string
  prezzo_vendita: number
}

/** Sotto le due lettere la ricerca mostrerebbe mezzo listino: inutile su un telefono. */
const LETTERE_MINIME = 2
const RISULTATI_MASSIMI = 20

export function PassoMateriali({
  listino,
  righe,
  onCambio,
}: {
  listino: MaterialeListino[]
  righe: RigaMaterialeBozza[]
  onCambio: (righe: RigaMaterialeBozza[]) => void
}) {
  const [ricerca, setRicerca] = useState('')
  const idRicerca = useId()

  const risultati = useMemo(() => {
    const termine = ricerca.trim().toLowerCase()
    if (termine.length < LETTERE_MINIME) return []

    return listino
      .filter(
        (materiale) =>
          materiale.descrizione.toLowerCase().includes(termine) ||
          materiale.codice.toLowerCase().includes(termine),
      )
      .slice(0, RISULTATI_MASSIMI)
  }, [listino, ricerca])

  function cambiaQuantita(materiale: MaterialeListino, delta: number) {
    const esistente = righe.find((riga) => riga.materiale_id === materiale.id)
    const quantita = (esistente?.quantita ?? 0) + delta
    const altre = righe.filter((riga) => riga.materiale_id !== materiale.id)

    if (quantita <= 0) return onCambio(altre)

    onCambio([
      ...altre,
      {
        materiale_id: materiale.id,
        descrizione: materiale.descrizione,
        quantita,
        prezzo_vendita: materiale.prezzo_vendita,
      },
    ])
  }

  const totale = righe.reduce((somma, riga) => somma + riga.quantita * riga.prezzo_vendita, 0)

  return (
    <section className="flex flex-col gap-4">
      <label htmlFor={idRicerca} className="flex flex-col gap-1 text-sm text-slate-600">
        Cerca materiale
        <input
          id={idRicerca}
          type="search"
          value={ricerca}
          onChange={(evento) => setRicerca(evento.target.value)}
          placeholder="Codice o descrizione"
          autoComplete="off"
          className="h-14 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
        />
      </label>

      {risultati.length > 0 && (
        <ul className="flex flex-col gap-2">
          {risultati.map((materiale) => (
            <li key={materiale.id}>
              <button
                type="button"
                aria-label={`Aggiungi ${materiale.descrizione}`}
                onClick={() => cambiaQuantita(materiale, 1)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left"
              >
                <span>
                  <span className="block text-base">{materiale.descrizione}</span>
                  <span className="block text-xs tabular-nums text-slate-500">
                    {materiale.codice} · {formattaEuro(materiale.prezzo_vendita)} /{' '}
                    {materiale.unita}
                  </span>
                </span>
                <Plus className="size-5 shrink-0 text-[#27705c]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600">
          Materiali usati
        </h3>

        {righe.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nessun materiale.</p>
        ) : (
          <ul>
            {righe.map((riga) => {
              const materiale = listino.find((voce) => voce.id === riga.materiale_id)

              return (
                <li
                  key={riga.materiale_id ?? riga.descrizione}
                  className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base">{riga.descrizione}</span>
                    <span className="block text-xs tabular-nums text-slate-500">
                      {formattaEuro(riga.quantita * riga.prezzo_vendita)}
                    </span>
                  </span>

                  <button
                    type="button"
                    aria-label={`Riduci ${riga.descrizione}`}
                    onClick={() => materiale && cambiaQuantita(materiale, -1)}
                    className="flex size-12 items-center justify-center rounded-xl border border-slate-300"
                  >
                    <Minus className="size-5" aria-hidden="true" />
                  </button>

                  <span className="w-12 text-center font-[family-name:var(--font-titoli)] text-lg font-semibold tabular-nums">
                    {riga.quantita}
                  </span>

                  <button
                    type="button"
                    aria-label={`Aumenta ${riga.descrizione}`}
                    onClick={() => materiale && cambiaQuantita(materiale, 1)}
                    className="flex size-12 items-center justify-center rounded-xl bg-[#27705c] text-white"
                  >
                    <Plus className="size-5" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-sm text-slate-600">Totale materiali</span>
          <span className="text-lg font-semibold tabular-nums">{formattaEuro(totale)}</span>
        </div>
      </div>
    </section>
  )
}
