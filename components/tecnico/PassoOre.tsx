'use client'

import { useEffect, useState } from 'react'
import { Minus, Play, Plus, Square } from 'lucide-react'
import { formattaEuro, formattaOre } from '@/lib/calcoli'
import { minutiTimer, type RigaOreBozza } from '@/lib/bozza'
import type { TipoOra } from '@/lib/supabase/tipi'

export type Tariffe = { viaggio: number; ordinario: number; urgenza: number }

const TIPI: { tipo: TipoOra; etichetta: string }[] = [
  { tipo: 'viaggio', etichetta: 'Viaggio' },
  { tipo: 'ordinario', etichetta: 'Ordinario' },
  { tipo: 'urgenza', etichetta: 'Urgenza' },
]

const PASSO_MINUTI = 15

export function PassoOre({
  ore,
  timerAvviatoIl,
  tariffe,
  onCambio,
  onTimer,
}: {
  ore: RigaOreBozza[]
  timerAvviatoIl: number | null
  tariffe: Tariffe
  onCambio: (ore: RigaOreBozza[]) => void
  onTimer: (avviatoIl: number | null) => void
}) {
  const [adesso, setAdesso] = useState(() => Date.now())

  useEffect(() => {
    if (!timerAvviatoIl) return
    const intervallo = setInterval(() => setAdesso(Date.now()), 10_000)
    return () => clearInterval(intervallo)
  }, [timerAvviatoIl])

  const minutiDi = (tipo: TipoOra) => ore.find((riga) => riga.tipo === tipo)?.minuti ?? 0

  function cambia(tipo: TipoOra, delta: number) {
    const nuovi = Math.max(0, minutiDi(tipo) + delta)
    const altre = ore.filter((riga) => riga.tipo !== tipo)

    onCambio(
      nuovi === 0
        ? altre
        : [...altre, { tipo, minuti: nuovi, prezzo_orario: tariffe[tipo] }].sort((a, b) =>
            a.tipo.localeCompare(b.tipo),
          ),
    )
  }

  const trascorsi = minutiTimer(timerAvviatoIl, adesso)

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">Timer di lavoro</span>
          <span className="font-[family-name:var(--font-titoli)] text-3xl font-semibold tabular-nums">
            {formattaOre(trascorsi)}
          </span>
        </div>

        {timerAvviatoIl ? (
          <button
            type="button"
            onClick={() => {
              cambia('ordinario', trascorsi)
              onTimer(null)
            }}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-medium text-white"
          >
            <Square className="size-5" aria-hidden="true" /> Ferma timer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTimer(Date.now())}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#27705c] bg-white text-base font-medium text-[#1f5c4b]"
          >
            <Play className="size-5" aria-hidden="true" /> Avvia timer
          </button>
        )}
      </div>

      {TIPI.map(({ tipo, etichetta }) => (
        <div key={tipo} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium">{etichetta}</span>
            <span className="text-xs tabular-nums text-slate-500">
              {formattaEuro(tariffe[tipo])} / h
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              aria-label={`Togli ${PASSO_MINUTI} minuti a ${tipo}`}
              onClick={() => cambia(tipo, -PASSO_MINUTI)}
              className="flex size-14 items-center justify-center rounded-xl border border-slate-300"
            >
              <Minus className="size-5" aria-hidden="true" />
            </button>

            <output className="flex-1 text-center font-[family-name:var(--font-titoli)] text-xl font-semibold tabular-nums">
              {formattaOre(minutiDi(tipo))}
            </output>

            <button
              type="button"
              aria-label={`Aggiungi ${PASSO_MINUTI} minuti a ${tipo}`}
              onClick={() => cambia(tipo, PASSO_MINUTI)}
              className="flex size-14 items-center justify-center rounded-xl bg-[#27705c] text-white"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
