import Link from 'next/link'
import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { calcolaTotali, formattaEuro, formattaOre } from '@/lib/calcoli'
import { AscoltaRapportini } from '@/components/ufficio/AscoltaRapportini'

const STATI = ['da_fatturare', 'fatturato', 'non_fatturabile'] as const
type Stato = (typeof STATI)[number]

const etichetta: Record<Stato, string> = {
  da_fatturare: 'Da fatturare',
  fatturato: 'Fatturati',
  non_fatturabile: 'Non fatturabili',
}

export default async function Rapportini({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; dal?: string; al?: string }>
}) {
  await richiediRuolo(['ufficio', 'titolare'])
  const parametri = await searchParams

  const stato: Stato = STATI.includes(parametri.stato as Stato)
    ? (parametri.stato as Stato)
    : 'da_fatturare'

  const oggi = new Date().toISOString().slice(0, 10)
  const dal = parametri.dal ?? `${oggi.slice(0, 4)}-01-01`
  const al = parametri.al ?? oggi

  const supabase = await clientServer()
  const { data } = await supabase
    .from('rapportini')
    .select(
      `id, chiuso_il, firma_url, stato_fatturazione,
       interventi!inner ( data, descrizione, sedi ( clienti ( ragione_sociale ) ) ),
       utenti!rapportini_tecnico_id_fkey ( nome ),
       rapportino_ore ( minuti, prezzo_orario ),
       rapportino_materiali ( quantita, prezzo_vendita )`,
    )
    .eq('stato_fatturazione', stato)
    .order('chiuso_il', { ascending: false })

  const righe = (data ?? []).map((rapportino) => {
    const ore = rapportino.rapportino_ore ?? []
    const totali = calcolaTotali(
      ore.map((riga) => ({
        tipo: 'ordinario' as const,
        minuti: riga.minuti,
        prezzo_orario: Number(riga.prezzo_orario),
      })),
      (rapportino.rapportino_materiali ?? []).map((riga) => ({
        quantita: Number(riga.quantita),
        prezzo_vendita: Number(riga.prezzo_vendita),
      })),
    )

    return {
      id: rapportino.id,
      data: rapportino.interventi?.data ?? '',
      cliente: rapportino.interventi?.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato',
      descrizione: rapportino.interventi?.descrizione ?? '',
      tecnico: rapportino.utenti?.nome ?? 'Tecnico non indicato',
      firmato: Boolean(rapportino.firma_url),
      minuti: ore.reduce((somma, riga) => somma + riga.minuti, 0),
      totale: totali.totale,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <AscoltaRapportini />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--font-titoli)] text-xl font-semibold">Rapportini</h1>

        <nav className="flex gap-2" aria-label="Filtra per stato">
          {STATI.map((voce) => (
            <Link
              key={voce}
              href={`/rapportini?stato=${voce}`}
              aria-current={voce === stato}
              className={
                voce === stato
                  ? 'rounded-lg bg-[#27705c] px-3 py-2 text-sm font-medium text-white'
                  : 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700'
              }
            >
              {etichetta[voce]}
            </Link>
          ))}
        </nav>

        <a
          href={`/api/export/rapportini?dal=${dal}&al=${al}`}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          Esporta CSV per il commercialista
        </a>
      </div>

      {righe.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Nessun rapportino in questo stato.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-medium text-slate-600">
                  Cliente
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-medium text-slate-600">
                  Tecnico
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right font-medium text-slate-600">
                  Ore
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right font-medium text-slate-600">
                  Totale
                </th>
                <th className="border-b border-slate-200 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {righe.map((riga) => (
                <tr key={riga.id}>
                  <td className="border-b border-slate-200 px-4 py-3">
                    {riga.cliente}
                    {!riga.firmato && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Non firmato
                      </span>
                    )}
                    <span className="block text-xs text-slate-500">
                      {riga.descrizione} · {riga.data}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3">{riga.tecnico}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-right tabular-nums">
                    {formattaOre(riga.minuti)}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-right font-medium tabular-nums">
                    {formattaEuro(riga.totale)}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-right">
                    <Link href={`/rapportini/${riga.id}`} className="text-[#1f5c4b] underline">
                      Dettaglio
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
