import Link from 'next/link'
import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { dataDiOggi, inItaliano, spostaGiorno } from '@/lib/data'
import { Tabellone } from '@/components/ufficio/Tabellone'
import { DialogIntervento } from '@/components/ufficio/DialogIntervento'
import type { InterventoPlanning } from '@/components/ufficio/CardPlanning'

export default async function Planning({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  await richiediRuolo(['ufficio', 'titolare'])
  const parametri = await searchParams
  const data = parametri.data ?? dataDiOggi()

  const supabase = await clientServer()

  const [{ data: tecnici }, { data: righe }, { data: sedi }] = await Promise.all([
    supabase
      .from('utenti')
      .select('id, nome, colore')
      .eq('ruolo', 'tecnico')
      .eq('attivo', true)
      .order('nome'),
    supabase
      .from('interventi')
      .select(
        `id, tecnico_id, ora_inizio, descrizione, priorita, stato,
         sedi ( indirizzo, comune, clienti ( ragione_sociale ) )`,
      )
      .eq('data', data)
      .neq('stato', 'annullato')
      .order('ora_inizio', { ascending: true, nullsFirst: false }),
    supabase
      .from('sedi')
      .select('id, etichetta, indirizzo, clienti ( ragione_sociale )')
      .order('etichetta'),
  ])

  const interventi: InterventoPlanning[] = (righe ?? []).map((riga) => ({
    id: riga.id,
    tecnico_id: riga.tecnico_id,
    ora_inizio: riga.ora_inizio,
    cliente: riga.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato',
    indirizzo: [riga.sedi?.indirizzo, riga.sedi?.comune].filter(Boolean).join(', '),
    descrizione: riga.descrizione,
    priorita: riga.priorita,
    stato: riga.stato,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/planning?data=${spostaGiorno(data, -1)}`}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          ← {inItaliano(spostaGiorno(data, -1))}
        </Link>

        <h1 className="font-[family-name:var(--font-titoli)] text-xl font-semibold capitalize">
          {inItaliano(data)}
        </h1>

        <Link
          href={`/planning?data=${spostaGiorno(data, 1)}`}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {inItaliano(spostaGiorno(data, 1))} →
        </Link>

        <div className="ml-auto">
          <DialogIntervento
            data={data}
            tecnici={(tecnici ?? []).map(({ id, nome }) => ({ id, nome }))}
            sedi={(sedi ?? []).map((sede) => ({
              id: sede.id,
              etichetta: sede.etichetta,
              indirizzo: sede.indirizzo,
              cliente: sede.clienti?.ragione_sociale ?? 'Senza cliente',
            }))}
          />
        </div>
      </div>

      {(tecnici ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Nessun tecnico attivo in anagrafica: il tabellone non ha colonne da mostrare.
        </p>
      ) : (
        <Tabellone
          tecnici={(tecnici ?? []).map((tecnico) => ({ ...tecnico, colore: tecnico.colore }))}
          interventi={interventi.filter((intervento) => intervento.tecnico_id !== null)}
          nonAssegnati={interventi.filter((intervento) => intervento.tecnico_id === null)}
        />
      )}
    </div>
  )
}
