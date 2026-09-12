import { BarraRuolo } from '@/components/comuni/BarraRuolo'
import { richiediRuolo } from '@/lib/sessione'

export default async function LayoutUfficio({ children }: { children: React.ReactNode }) {
  const utente = await richiediRuolo(['ufficio', 'titolare'])

  return (
    <div className="min-h-dvh bg-slate-50">
      <BarraRuolo
        nome={utente.nome}
        ruolo={utente.ruolo === 'titolare' ? 'Titolare' : 'Ufficio'}
        voci={[
          { href: '/planning', etichetta: 'Planning' },
          { href: '/rapportini', etichetta: 'Rapportini' },
          { href: '/scadenzario', etichetta: 'Scadenzario' },
        ]}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
