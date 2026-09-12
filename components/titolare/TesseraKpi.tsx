import { cn } from '@/lib/utils'

export function TesseraKpi({
  etichetta,
  valore,
  dettaglio,
  tono = 'neutro',
}: {
  etichetta: string
  valore: string
  dettaglio?: string
  tono?: 'neutro' | 'positivo' | 'negativo'
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm text-slate-600">{etichetta}</h2>
      <p
        className={cn(
          'mt-2 font-[family-name:var(--font-titoli)] text-3xl font-semibold tabular-nums',
          tono === 'positivo' && 'text-[#1f5c4b]',
          tono === 'negativo' && 'text-red-700',
        )}
      >
        {valore}
      </p>
      {dettaglio && <p className="mt-1 text-xs text-slate-500">{dettaglio}</p>}
    </article>
  )
}
