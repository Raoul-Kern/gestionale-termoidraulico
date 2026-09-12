import { notFound } from 'next/navigation'
import { richiediRuolo } from '@/lib/sessione'
import { clientServer } from '@/lib/supabase/server'
import { FormRapportino } from '@/components/tecnico/FormRapportino'

export default async function PaginaRapportino({
  params,
}: {
  params: Promise<{ interventoId: string }>
}) {
  const { interventoId } = await params
  await richiediRuolo(['tecnico'])
  const supabase = await clientServer()

  // Le policy limitano già la riga al tecnico assegnato: se non torna niente,
  // l'intervento non esiste o non è suo, e il risultato per lui è lo stesso.
  const { data: intervento } = await supabase
    .from('interventi')
    .select('id, descrizione, sedi ( indirizzo, comune, clienti ( ragione_sociale ) )')
    .eq('id', interventoId)
    .maybeSingle()

  if (!intervento) notFound()

  const [{ data: listino }, { data: impostazioni }] = await Promise.all([
    supabase
      .from('materiali')
      .select('id, codice, descrizione, unita, prezzo_vendita')
      .eq('attivo', true)
      .order('descrizione'),
    supabase
      .from('impostazioni')
      .select('prezzo_ora_viaggio, prezzo_ora_ordinaria, prezzo_ora_urgenza')
      .single(),
  ])

  return (
    <FormRapportino
      interventoId={intervento.id}
      cliente={intervento.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato'}
      indirizzo={[intervento.sedi?.indirizzo, intervento.sedi?.comune].filter(Boolean).join(', ')}
      descrizione={intervento.descrizione}
      listino={(listino ?? []).map((voce) => ({ ...voce, prezzo_vendita: Number(voce.prezzo_vendita) }))}
      tariffe={{
        viaggio: Number(impostazioni?.prezzo_ora_viaggio ?? 30),
        ordinario: Number(impostazioni?.prezzo_ora_ordinaria ?? 40),
        urgenza: Number(impostazioni?.prezzo_ora_urgenza ?? 60),
      }}
    />
  )
}
