import { BarraRuolo } from '@/components/comuni/BarraRuolo'
import { richiediRuolo } from '@/lib/sessione'

export default async function LayoutTitolare({ children }: { children: React.ReactNode }) {
  const utente = await richiediRuolo(['titolare'])

  return (
    <div className="min-h-dvh bg-slate-50">
      <BarraRuolo
        nome={utente.nome}
        ruolo="Titolare"
        voci={[
          { href: '/dashboard', etichetta: 'Dashboard' },
          { href: '/planning', etichetta: 'Planning' },
          { href: '/rapportini', etichetta: 'Rapportini' },
        ]}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
