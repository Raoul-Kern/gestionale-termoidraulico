import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { formattaEuro } from '@/lib/calcoli'
import { periodoDaParametri } from '@/lib/periodo'
import { TesseraKpi } from '@/components/titolare/TesseraKpi'

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ dal?: string; al?: string }>
}) {
  await richiediRuolo(['titolare'])
  const parametri = await searchParams
  const { dal, al } = periodoDaParametri(parametri.dal, parametri.al)

  const supabase = await clientServer()

  // I costi passano solo da qui: la colonna è revocata anche al titolare.
  const [{ data: righe }, { data: tecnici }, { data: listino }] = await Promise.all([
    supabase.rpc('margini', { dal, al }),
    supabase.from('utenti').select('id, nome'),
    supabase.rpc('listino_con_costi'),
  ])

  const interventi = righe ?? []
  const somma = (prendi: (riga: (typeof interventi)[number]) => number) =>
    interventi.reduce((totale, riga) => totale + prendi(riga), 0)

  const ricavo = somma((riga) => Number(riga.totale_intervento ?? 0))
  const costoOre = somma((riga) => Number(riga.costo_ore ?? 0))
  const costoMateriali = somma((riga) => Number(riga.costo_materiali ?? 0))
  const margine = ricavo - costoOre - costoMateriali
  const incompleti = interventi.filter((riga) => riga.margine_incompleto).length

  const nomi = new Map((tecnici ?? []).map((tecnico) => [tecnico.id, tecnico.nome]))
  const perTecnico = new Map<string, { interventi: number; ricavo: number; margine: number }>()

  for (const riga of interventi) {
    const chiave = riga.tecnico_id ?? 'senza'
    const attuale = perTecnico.get(chiave) ?? { interventi: 0, ricavo: 0, margine: 0 }
    perTecnico.set(chiave, {
      interventi: attuale.interventi + 1,
      ricavo: attuale.ricavo + Number(riga.totale_intervento ?? 0),
      margine: attuale.margine + Number(riga.margine ?? 0),
    })
  }

  const piuVenduti = (listino ?? [])
    .filter((voce) => voce.ricarico_percentuale !== null)
    .slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-[family-name:var(--font-titoli)] text-xl font-semibold">
          Margini dal {dal} al {al}
        </h1>

        <form className="flex flex-wrap items-end gap-2">
          <label htmlFor="dal" className="flex flex-col gap-1 text-xs text-slate-600">
            Dal
            <input
              id="dal"
              name="dal"
              type="date"
              defaultValue={dal}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            />
          </label>
          <label htmlFor="al" className="flex flex-col gap-1 text-xs text-slate-600">
            Al
            <input
              id="al"
              name="al"
              type="date"
              defaultValue={al}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            Aggiorna
          </button>
        </form>
      </div>

      {incompleti > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Margine parziale: {incompleti}{' '}
          {incompleti === 1 ? 'intervento è stato chiuso' : 'interventi sono stati chiusi'} da un
          tecnico senza tariffa di costo in anagrafica. Per quelli il margine risulta pari al
          ricavo.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TesseraKpi etichetta="Ricavo" valore={formattaEuro(ricavo)} />
        <TesseraKpi etichetta="Costo del lavoro" valore={formattaEuro(costoOre)} />
        <TesseraKpi etichetta="Costo dei materiali" valore={formattaEuro(costoMateriali)} />
        <TesseraKpi
          etichetta="Margine"
          valore={formattaEuro(margine)}
          tono={margine >= 0 ? 'positivo' : 'negativo'}
          dettaglio={ricavo > 0 ? `${((margine / ricavo) * 100).toFixed(1)}% del ricavo` : undefined}
        />
      </div>

      {interventi.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Nessun intervento chiuso nel periodo.
        </p>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 font-[family-name:var(--font-titoli)] font-semibold">
            Per tecnico
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Tecnico', 'Interventi', 'Ricavo', 'Margine', '%'].map((intestazione) => (
                  <th
                    key={intestazione}
                    className="border-b border-slate-200 px-4 py-2 text-left font-medium text-slate-600"
                  >
                    {intestazione}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...perTecnico.entries()].map(([id, valori]) => (
                <tr key={id}>
                  <td className="border-b border-slate-200 px-4 py-2">
                    {nomi.get(id) ?? 'Non assegnato'}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {valori.interventi}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {formattaEuro(valori.ricavo)}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {formattaEuro(valori.margine)}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {valori.ricavo > 0 ? `${((valori.margine / valori.ricavo) * 100).toFixed(1)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {piuVenduti.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-3 font-[family-name:var(--font-titoli)] font-semibold">
            Ricarico sul listino
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Materiale', 'Acquisto', 'Vendita', 'Ricarico %'].map((intestazione) => (
                  <th
                    key={intestazione}
                    className="border-b border-slate-200 px-4 py-2 text-left font-medium text-slate-600"
                  >
                    {intestazione}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {piuVenduti.map((voce) => (
                <tr key={voce.id}>
                  <td className="border-b border-slate-200 px-4 py-2">{voce.descrizione}</td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {formattaEuro(Number(voce.prezzo_acquisto))}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {formattaEuro(Number(voce.prezzo_vendita))}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-2 tabular-nums">
                    {Number(voce.ricarico_percentuale).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
