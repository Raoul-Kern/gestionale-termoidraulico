import { richiediRuolo } from '@/lib/sessione'

export default async function LayoutTecnico({ children }: { children: React.ReactNode }) {
  const utente = await richiediRuolo(['tecnico'])

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <span className="text-base font-semibold">{utente.nome}</span>
        <span className="text-xs uppercase tracking-wide text-slate-500">Tecnico</span>
      </header>
      {children}
    </div>
  )
}
