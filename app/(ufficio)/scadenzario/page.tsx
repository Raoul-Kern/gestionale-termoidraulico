import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { statoScadenza } from '@/lib/calcoli'
import { dataDiOggi } from '@/lib/data'
import { BadgeScadenza } from '@/components/ufficio/BadgeScadenza'
import { registraManutenzione } from './azioni'

const etichettaTipo: Record<string, string> = {
  caldaia: 'Caldaia',
  condizionatore: 'Condizionatore',
  pompa_calore: 'Pompa di calore',
  altro: 'Altro',
}

export default async function Scadenzario() {
  await richiediRuolo(['ufficio', 'titolare'])
  const supabase = await clientServer()
  const oggi = new Date()

  const { data } = await supabase
    .from('impianti')
    .select(
      `id, tipo, marca, modello, matricola, ultima_manutenzione, prossima_manutenzione,
       sedi ( indirizzo, comune, clienti ( ragione_sociale, telefono ) )`,
    )
    .eq('attivo', true)
    .order('prossima_manutenzione', { ascending: true, nullsFirst: false })

  const impianti = data ?? []
  const scaduti = impianti.filter((i) => statoScadenza(i.prossima_manutenzione, oggi) === 'scaduto')
  const inScadenza = impianti.filter(
    (i) => statoScadenza(i.prossima_manutenzione, oggi) === 'in_scadenza',
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-titoli)] text-xl font-semibold">
        Manutenzioni da richiamare
      </h1>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-36 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <strong className="block text-3xl font-semibold tabular-nums text-red-700">
            {scaduti.length}
          </strong>
          <span className="text-xs text-slate-600">Scaduti</span>
        </div>
        <div className="min-w-36 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <strong className="block text-3xl font-semibold tabular-nums">{inScadenza.length}</strong>
          <span className="text-xs text-slate-600">In scadenza entro 30 giorni</span>
        </div>
        <div className="min-w-36 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <strong className="block text-3xl font-semibold tabular-nums">{impianti.length}</strong>
          <span className="text-xs text-slate-600">Impianti seguiti</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Impianto', 'Cliente', 'Ultima', 'Scadenza', ''].map((intestazione) => (
                <th
                  key={intestazione}
                  className="border-b border-slate-200 px-4 py-3 text-left font-medium text-slate-600"
                >
                  {intestazione}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {impianti.map((impianto) => {
              async function registraOggi() {
                'use server'
                await registraManutenzione(impianto.id, dataDiOggi())
              }

              return (
                <tr key={impianto.id}>
                  <td className="border-b border-slate-200 px-4 py-3">
                    {etichettaTipo[impianto.tipo] ?? impianto.tipo} {impianto.marca}{' '}
                    {impianto.modello}
                    <span className="block text-xs text-slate-500">
                      {impianto.matricola ? `Matricola ${impianto.matricola}` : 'Senza matricola'}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3">
                    {impianto.sedi?.clienti?.ragione_sociale}
                    <span className="block text-xs text-slate-500">
                      {[impianto.sedi?.indirizzo, impianto.sedi?.comune].filter(Boolean).join(', ')}
                    </span>
                    {impianto.sedi?.clienti?.telefono && (
                      <a
                        href={`tel:${impianto.sedi.clienti.telefono}`}
                        className="text-xs text-[#1f5c4b] underline"
                      >
                        {impianto.sedi.clienti.telefono}
                      </a>
                    )}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 tabular-nums">
                    {impianto.ultima_manutenzione ?? '—'}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3">
                    <BadgeScadenza prossima={impianto.prossima_manutenzione} oggi={oggi} />
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 text-right">
                    <form action={registraOggi}>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      >
                        Registrata oggi
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
