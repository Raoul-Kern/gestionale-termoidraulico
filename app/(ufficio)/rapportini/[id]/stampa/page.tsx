import { notFound } from 'next/navigation'
import { richiediRuolo } from '@/lib/sessione'
import { leggiRapportino } from '@/lib/rapportino-dettaglio'
import { DettaglioRapportino } from '@/components/ufficio/DettaglioRapportino'
import { PulsanteStampa } from '@/components/ufficio/PulsanteStampa'

/**
 * Versione stampabile. Il PDF lo produce il browser: nessuna libreria di
 * generazione, nessun carattere da incorporare, e quello che si vede a schermo
 * è quello che esce dalla stampante.
 */
export default async function Stampa({ params }: { params: Promise<{ id: string }> }) {
  await richiediRuolo(['ufficio', 'titolare'])
  const { id } = await params
  const rapportino = await leggiRapportino(id)

  if (!rapportino) notFound()

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900">
      <style>{`@page { size: A4; margin: 16mm } @media print { .senza-stampa { display: none } }`}</style>

      <div className="senza-stampa mb-6">
        <PulsanteStampa />
      </div>

      <header className="mb-6 border-b border-slate-300 pb-4">
        <h1 className="font-[family-name:var(--font-titoli)] text-2xl font-semibold">
          Rapportino di intervento
        </h1>
        <p className="mt-2 text-sm">
          <strong>{rapportino.cliente}</strong>
          {rapportino.partitaIva ? ` · P. IVA ${rapportino.partitaIva}` : ''}
        </p>
        <p className="text-sm">{rapportino.indirizzo}</p>
        <p className="mt-2 text-sm">
          Data {rapportino.data} · Tecnico {rapportino.tecnico}
        </p>
        <p className="mt-2">{rapportino.descrizione}</p>
      </header>

      <DettaglioRapportino
        ore={rapportino.ore}
        materiali={rapportino.materiali}
        ricavoOre={rapportino.totali.ricavoOre}
        ricavoMateriali={rapportino.totali.ricavoMateriali}
        totale={rapportino.totali.totale}
      />

      {rapportino.note && (
        <section className="mt-6">
          <h2 className="font-[family-name:var(--font-titoli)] text-lg font-semibold">Note</h2>
          <p className="whitespace-pre-line text-sm">{rapportino.note}</p>
        </section>
      )}

      <section className="mt-8">
        <p className="text-sm text-slate-600">Firma del cliente</p>
        {rapportino.firmaUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={rapportino.firmaUrl}
            alt={`Firma di ${rapportino.firmatario ?? 'cliente'}`}
            className="mt-2 h-32 rounded border border-slate-300"
          />
        ) : (
          <div className="mt-2 h-24 border-b border-slate-400" />
        )}
        <p className="mt-1 text-sm">{rapportino.firmatario ?? ''}</p>
      </section>
    </div>
  )
}
