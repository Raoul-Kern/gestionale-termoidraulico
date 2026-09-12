'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { fasceOrarie, fasciaDiAppartenenza, idCella, leggiCella } from '@/lib/planning'
import { spostaIntervento } from '@/app/(ufficio)/planning/azioni'
import { CardPlanning, type InterventoPlanning } from './CardPlanning'

export type TecnicoColonna = { id: string; nome: string; colore: string }

function Cella({
  tecnicoId,
  fascia,
  children,
}: {
  tecnicoId: string
  fascia: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: idCella(tecnicoId, fascia) })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-20 flex-col gap-1 border-b border-r border-slate-200 p-1 ${
        isOver ? 'bg-[#f7f0e2] shadow-[inset_0_0_0_2px_#8a6220]' : 'bg-white'
      }`}
    >
      {children}
    </div>
  )
}

export function Tabellone({
  tecnici,
  interventi,
  nonAssegnati,
}: {
  tecnici: TecnicoColonna[]
  interventi: InterventoPlanning[]
  nonAssegnati: InterventoPlanning[]
}) {
  const router = useRouter()
  const [, avvia] = useTransition()

  // Una soglia di movimento: senza, ogni tocco su una card parte come trascinamento.
  // Il sensore da tastiera non è un di più: chi lavora in ufficio sposta
  // decine di interventi al giorno e non tutti usano il mouse.
  const sensori = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )
  const fasce = fasceOrarie()

  function alRilascio(evento: DragEndEvent) {
    const destinazione = evento.over?.id
    if (!destinazione) return

    const { tecnicoId, fascia } = leggiCella(String(destinazione))
    const interventoId = String(evento.active.id)

    avvia(async () => {
      await spostaIntervento(interventoId, tecnicoId, fascia)
      router.refresh()
    })
  }

  return (
    <DndContext sensors={sensori} onDragEnd={alRilascio}>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#8a6220] bg-[#f7f0e2] px-3 py-3">
        <strong className="font-[family-name:var(--font-titoli)] text-sm text-[#8a6220]">
          Da assegnare
        </strong>

        {nonAssegnati.length === 0 ? (
          <span className="text-sm text-slate-600">Tutto assegnato.</span>
        ) : (
          nonAssegnati.map((intervento) => (
            <div key={intervento.id} className="w-56">
              <CardPlanning intervento={intervento} />
            </div>
          ))
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div
          className="grid min-w-max text-sm"
          style={{ gridTemplateColumns: `4.5rem repeat(${tecnici.length}, minmax(11rem, 1fr))` }}
        >
          <div className="sticky left-0 z-20 border-b-2 border-r border-b-[#27705c] border-r-slate-200 bg-white p-2 font-[family-name:var(--font-titoli)] font-semibold">
            Ora
          </div>

          {tecnici.map((tecnico) => (
            <div
              key={tecnico.id}
              className="border-b-2 border-r border-b-[#27705c] border-r-slate-200 bg-white p-2 font-[family-name:var(--font-titoli)] font-semibold"
            >
              {tecnico.nome}
            </div>
          ))}

          {fasce.map((fascia) => (
            <div key={fascia} className="contents">
              <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-2 text-xs tabular-nums text-slate-500">
                {fascia}
              </div>

              {tecnici.map((tecnico) => (
                <Cella key={`${tecnico.id}-${fascia}`} tecnicoId={tecnico.id} fascia={fascia}>
                  {interventi
                    .filter(
                      (intervento) =>
                        intervento.tecnico_id === tecnico.id &&
                        fasciaDiAppartenenza(intervento.ora_inizio) === fascia,
                    )
                    .map((intervento) => (
                      <CardPlanning key={intervento.id} intervento={intervento} />
                    ))}
                </Cella>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  )
}
