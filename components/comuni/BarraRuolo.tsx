import Link from 'next/link'
import { cn } from '@/lib/utils'

export type VoceNavigazione = { href: string; etichetta: string }

/** Intestazione comune a ufficio e titolare: chi sei, e dove puoi andare. */
export function BarraRuolo({
  nome,
  ruolo,
  voci,
}: {
  nome: string
  ruolo: string
  voci: VoceNavigazione[]
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-titoli)] text-xl font-semibold">
            Rapportini
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">{ruolo}</span>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Sezioni">
          {voci.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-slate-700',
                'hover:bg-slate-100',
              )}
            >
              {voce.etichetta}
            </Link>
          ))}
        </nav>

        <span className="text-sm text-slate-600">{nome}</span>
      </div>
    </header>
  )
}
