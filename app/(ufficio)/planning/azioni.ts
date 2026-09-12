'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'
import type { Priorita } from '@/lib/supabase/tipi'

export async function spostaIntervento(interventoId: string, tecnicoId: string, fascia: string) {
  const supabase = await clientServer()

  const { error } = await supabase
    .from('interventi')
    .update({ tecnico_id: tecnicoId, ora_inizio: `${fascia}:00` })
    .eq('id', interventoId)

  if (error) throw new Error(error.message)
  revalidatePath('/planning')
}

export async function creaClienteRapido(dati: FormData) {
  const supabase = await clientServer()

  const { data: cliente, error: erroreCliente } = await supabase
    .from('clienti')
    .insert({
      ragione_sociale: String(dati.get('ragione_sociale') ?? '').trim(),
      telefono: String(dati.get('telefono') ?? '').trim() || null,
    })
    .select('id')
    .single()

  if (erroreCliente || !cliente) throw new Error(erroreCliente?.message ?? 'Cliente non creato')

  const { data: sede, error: erroreSede } = await supabase
    .from('sedi')
    .insert({
      cliente_id: cliente.id,
      indirizzo: String(dati.get('indirizzo') ?? '').trim(),
      comune: String(dati.get('comune') ?? '').trim() || null,
    })
    .select('id')
    .single()

  if (erroreSede || !sede) throw new Error(erroreSede?.message ?? 'Sede non creata')

  revalidatePath('/planning')
  return { clienteId: cliente.id, sedeId: sede.id }
}

export type EsitoIntervento = { errore?: string }

export async function creaIntervento(
  _precedente: EsitoIntervento | null,
  dati: FormData,
): Promise<EsitoIntervento> {
  const sedeId = String(dati.get('sede_id') ?? '')
  const descrizione = String(dati.get('descrizione') ?? '').trim()

  if (!sedeId) return { errore: 'Scegli una sede.' }
  if (!descrizione) return { errore: 'Scrivi cosa va fatto.' }

  const supabase = await clientServer()
  const oraInizio = String(dati.get('ora_inizio') ?? '')

  // Nessun cliente_id da passare: lo schema lo ricava dalla sede.
  const { error } = await supabase.from('interventi').insert({
    sede_id: sedeId,
    tecnico_id: String(dati.get('tecnico_id') ?? '') || null,
    data: String(dati.get('data') ?? ''),
    ora_inizio: oraInizio ? `${oraInizio}:00` : null,
    durata_prevista_minuti: Number(dati.get('durata') ?? 60),
    descrizione,
    priorita: String(dati.get('priorita') ?? 'normale') as Priorita,
  })

  if (error) return { errore: error.message }

  revalidatePath('/planning')
  return {}
}
