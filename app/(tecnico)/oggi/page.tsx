import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { CardIntervento, type InterventoDelGiorno } from '@/components/tecnico/CardIntervento'
import { StatoCoda } from '@/components/tecnico/StatoCoda'

export default async function Oggi() {
  const utente = await richiediRuolo(['tecnico'])
  const supabase = await clientServer()
  const oggi = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('interventi')
    .select(
      `id, ora_inizio, descrizione, priorita, stato,
       sedi ( indirizzo, comune, clienti ( ragione_sociale ) ),
       rapportini ( id )`,
    )
    .eq('tecnico_id', utente.id)
    .eq('data', oggi)
    .neq('stato', 'annullato')
    .order('ora_inizio', { ascending: true, nullsFirst: false })

  const interventi: InterventoDelGiorno[] = (data ?? []).map((riga) => ({
    id: riga.id,
    ora_inizio: riga.ora_inizio,
    descrizione: riga.descrizione,
    priorita: riga.priorita,
    stato: riga.stato,
    cliente: riga.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato',
    indirizzo: riga.sedi?.indirizzo ?? '',
    comune: riga.sedi?.comune ?? null,
    // Relazione uno a uno: PostgREST restituisce un oggetto, non una lista.
    haRapportino: Array.isArray(riga.rapportini)
      ? riga.rapportini.length > 0
      : riga.rapportini !== null,
  }))

  return (
    <main className="flex flex-col gap-4 p-4">
      <StatoCoda />
      <h1 className="font-[family-name:var(--font-titoli)] text-2xl font-semibold">Oggi</h1>

      {interventi.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Nessun intervento assegnato per oggi.
        </p>
      ) : (
        interventi.map((intervento) => (
          <CardIntervento key={intervento.id} intervento={intervento} />
        ))
      )}
    </main>
  )
}
