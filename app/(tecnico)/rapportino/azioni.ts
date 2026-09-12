'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'
import type { BozzaRapportino } from '@/lib/bozza'

/** Carica la firma come PNG in un bucket privato e restituisce il percorso. */
export async function caricaFirma(interventoId: string, dataUrl: string): Promise<string> {
  const supabase = await clientServer()

  const base64 = dataUrl.split(',')[1] ?? ''
  const binario = Buffer.from(base64, 'base64')
  const percorso = `${interventoId}/${Date.now()}.png`

  const { error } = await supabase.storage
    .from('firme')
    .upload(percorso, binario, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`Firma non caricata: ${error.message}`)
  return percorso
}

export async function chiudiRapportino(bozza: BozzaRapportino) {
  const supabase = await clientServer()

  let firmaUrl: string | null = null
  if (bozza.firmaDataUrl) firmaUrl = await caricaFirma(bozza.interventoId, bozza.firmaDataUrl)

  // Prezzi e tariffe non partono dal telefono: li rilegge il database alla
  // chiusura, così un listino vecchio in cache non produce importi sbagliati.
  const { data, error } = await supabase.rpc('chiudi_rapportino', {
    p_intervento_id: bozza.interventoId,
    p_note: bozza.note,
    p_firmatario: bozza.firmatario,
    p_firma_url: firmaUrl ?? undefined,
    p_ore: bozza.ore.map(({ tipo, minuti }) => ({ tipo, minuti })),
    p_materiali: bozza.materiali.map(
      ({ materiale_id, descrizione, quantita, prezzo_vendita }) => ({
        materiale_id,
        descrizione,
        quantita,
        prezzo_vendita,
      }),
    ),
    p_bozza_aggiornata_il: new Date(bozza.aggiornataIl).toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath('/oggi')
  revalidatePath('/rapportini')
  return { rapportinoId: data as string }
}
