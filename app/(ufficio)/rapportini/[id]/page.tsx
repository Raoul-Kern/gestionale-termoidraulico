import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { richiediRuolo } from '@/lib/sessione'
import { leggiRapportino } from '@/lib/rapportino-dettaglio'
import { DettaglioRapportino } from '@/components/ufficio/DettaglioRapportino'
import { segnaFatturato } from '../azioni'

export default async function PaginaDettaglio({ params }: { params: Promise<{ id: string }> }) {
  await richiediRuolo(['ufficio', 'titolare'])
  const { id } = await params
  const rapportino = await leggiRapportino(id)

  if (!rapportino) notFound()

  async function marcaFatturato() {
    'use server'
    await segnaFatturato(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-titoli)] text-2xl font-semibold">
            {rapportino.cliente}
          </h1>
          <p className="text-sm text-slate-600">
            {rapportino.indirizzo} · {rapportino.data} · {rapportino.tecnico}
          </p>
          <p className="mt-1">{rapportino.descrizione}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/rapportini/${rapportino.id}/stampa`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            Stampa o salva in PDF
          </Link>

          {rapportino.statoFatturazione === 'da_fatturare' && (
            <form action={marcaFatturato}>
              <button
                type="submit"
                className="rounded-lg bg-[#27705c] px-3 py-2 text-sm font-medium text-white"
              >
                Segna come fatturato
              </button>
            </form>
          )}
        </div>
      </header>

      <DettaglioRapportino
        ore={rapportino.ore}
        materiali={rapportino.materiali}
        ricavoOre={rapportino.totali.ricavoOre}
        ricavoMateriali={rapportino.totali.ricavoMateriali}
        totale={rapportino.totali.totale}
      />

      {rapportino.note && (
        <section>
          <h2 className="mb-1 font-[family-name:var(--font-titoli)] text-lg font-semibold">Note</h2>
          <p className="whitespace-pre-line text-sm">{rapportino.note}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-[family-name:var(--font-titoli)] text-lg font-semibold">Firma</h2>
        {rapportino.firmaUrl ? (
          <>
            <Image
              src={rapportino.firmaUrl}
              alt={`Firma di ${rapportino.firmatario ?? 'cliente'}`}
              width={320}
              height={140}
              unoptimized
              className="rounded-xl border border-slate-200 bg-white"
            />
            <p className="mt-1 text-sm text-slate-600">{rapportino.firmatario}</p>
          </>
        ) : (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Rapportino non firmato dal cliente.
          </p>
        )}
      </section>
    </div>
  )
}
