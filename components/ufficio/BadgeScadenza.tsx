import { statoScadenza } from '@/lib/calcoli'

const MILLISECONDI_AL_GIORNO = 86_400_000

const giorniDa = (data: string, riferimento: Date) =>
  Math.round(
    (Date.UTC(riferimento.getUTCFullYear(), riferimento.getUTCMonth(), riferimento.getUTCDate()) -
      new Date(`${data}T00:00:00Z`).getTime()) /
      MILLISECONDI_AL_GIORNO,
  )

export function BadgeScadenza({
  prossima,
  oggi = new Date(),
}: {
  prossima: string | null
  oggi?: Date
}) {
  const stato = statoScadenza(prossima, oggi)

  if (stato === 'sconosciuto') {
    return (
      <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
        Mai registrata
      </span>
    )
  }

  const dataItaliana = new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC' }).format(
    new Date(`${prossima}T00:00:00Z`),
  )

  if (stato === 'scaduto') {
    const giorni = giorniDa(prossima!, oggi)
    return (
      <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-[inset_0_0_0_1px_currentColor]">
        {giorni === 1 ? 'Scaduto da 1 giorno' : `Scaduto da ${giorni} giorni`}
      </span>
    )
  }

  if (stato === 'in_scadenza') {
    return (
      <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-[inset_0_0_0_1px_currentColor]">
        In scadenza il {dataItaliana}
      </span>
    )
  }

  return <span className="text-xs tabular-nums text-slate-600">{dataItaliana}</span>
}
