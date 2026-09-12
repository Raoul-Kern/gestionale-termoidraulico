import Link from 'next/link'
import { MapPin, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Priorita, StatoIntervento } from '@/lib/supabase/tipi'

export type InterventoDelGiorno = {
  id: string
  ora_inizio: string | null
  descrizione: string
  priorita: Priorita
  stato: StatoIntervento
  cliente: string
  indirizzo: string
  comune: string | null
  haRapportino: boolean
}

const etichettaPriorita: Record<Priorita, string> = {
  bassa: 'Bassa',
  normale: 'Normale',
  urgente: 'Urgente',
}

export function CardIntervento({ intervento }: { intervento: InterventoDelGiorno }) {
  const chiuso = intervento.stato === 'chiuso'
  const urgente = intervento.priorita === 'urgente' && !chiuso
  const indirizzoCompleto = [intervento.indirizzo, intervento.comune].filter(Boolean).join(', ')

  return (
    <article
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4',
        urgente && 'border-red-300 bg-red-50',
        chiuso && 'opacity-70',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-[family-name:var(--font-titoli)] text-xl font-semibold tabular-nums">
          {intervento.ora_inizio ? intervento.ora_inizio.slice(0, 5) : 'Orario libero'}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            chiuso ? 'bg-slate-200 text-slate-700' : 'bg-[#eaf2ee] text-[#1f5c4b]',
            urgente && 'bg-red-700 text-white',
          )}
        >
          {chiuso ? 'Chiuso' : etichettaPriorita[intervento.priorita]}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-medium">{intervento.cliente}</h2>

      <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {indirizzoCompleto}
      </p>

      <p className="mt-3 text-base">{intervento.descrizione}</p>

      <div className="mt-4 flex gap-3">
        <Link
          href={`/rapportino/${intervento.id}`}
          className="flex h-14 flex-1 items-center justify-center rounded-xl bg-[#27705c] text-base font-medium text-white"
        >
          {intervento.haRapportino ? 'Rivedi rapportino' : 'Apri rapportino'}
        </Link>

        <Link
          href={`https://maps.apple.com/?q=${encodeURIComponent(indirizzoCompleto)}`}
          aria-label={`Naviga verso ${indirizzoCompleto}`}
          className="flex size-14 items-center justify-center rounded-xl border border-slate-300"
        >
          <Navigation className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
