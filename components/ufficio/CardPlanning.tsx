'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Priorita, StatoIntervento } from '@/lib/supabase/tipi'

export type InterventoPlanning = {
  id: string
  tecnico_id: string | null
  ora_inizio: string | null
  cliente: string
  indirizzo: string
  descrizione: string
  priorita: Priorita
  stato: StatoIntervento
}

export function CardPlanning({ intervento }: { intervento: InterventoPlanning }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: intervento.id,
  })

  const chiuso = intervento.stato === 'chiuso'

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-lg border-l-[3px] bg-[#eaf2ee] px-2 py-1.5 text-xs',
        'border-l-[#27705c]',
        intervento.priorita === 'urgente' && !chiuso && 'border-l-red-700 bg-red-50',
        chiuso && 'opacity-60 border-dotted',
        isDragging && 'opacity-40',
      )}
    >
      <b className="block text-[13px] font-semibold">{intervento.cliente}</b>
      <span className="block text-slate-600">{intervento.descrizione}</span>
      <span className="block text-slate-500">{intervento.indirizzo}</span>
    </div>
  )
}
