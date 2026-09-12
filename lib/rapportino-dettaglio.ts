import { clientServer } from '@/lib/supabase/server'
import { calcolaTotali } from '@/lib/calcoli'
import type { TipoOra } from '@/lib/supabase/tipi'

/** Lettura condivisa fra la pagina di dettaglio e quella di stampa. */
export async function leggiRapportino(id: string) {
  const supabase = await clientServer()

  const { data } = await supabase
    .from('rapportini')
    .select(
      `id, note, firmatario, firma_url, chiuso_il, stato_fatturazione,
       interventi!inner ( data, descrizione, sedi ( indirizzo, comune, clienti ( ragione_sociale, partita_iva ) ) ),
       utenti!rapportini_tecnico_id_fkey ( nome ),
       rapportino_ore ( tipo, minuti, prezzo_orario ),
       rapportino_materiali ( descrizione, quantita, prezzo_vendita )`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null

  const ore = (data.rapportino_ore ?? []).map((riga) => ({
    tipo: riga.tipo as TipoOra,
    minuti: riga.minuti,
    prezzo_orario: Number(riga.prezzo_orario),
  }))

  const materiali = (data.rapportino_materiali ?? []).map((riga) => ({
    descrizione: riga.descrizione,
    quantita: Number(riga.quantita),
    prezzo_vendita: Number(riga.prezzo_vendita),
  }))

  let firmaUrl: string | null = null
  if (data.firma_url) {
    // URL firmato a vita breve: il bucket è privato e l'immagine non deve
    // restare raggiungibile dopo la visita.
    const { data: firmata } = await supabase.storage
      .from('firme')
      .createSignedUrl(data.firma_url, 60)
    firmaUrl = firmata?.signedUrl ?? null
  }

  return {
    id: data.id,
    note: data.note,
    firmatario: data.firmatario,
    firmaUrl,
    chiusoIl: data.chiuso_il,
    statoFatturazione: data.stato_fatturazione,
    data: data.interventi?.data ?? '',
    descrizione: data.interventi?.descrizione ?? '',
    cliente: data.interventi?.sedi?.clienti?.ragione_sociale ?? 'Cliente non indicato',
    partitaIva: data.interventi?.sedi?.clienti?.partita_iva ?? null,
    indirizzo: [data.interventi?.sedi?.indirizzo, data.interventi?.sedi?.comune]
      .filter(Boolean)
      .join(', '),
    tecnico: data.utenti?.nome ?? 'Tecnico non indicato',
    ore,
    materiali,
    totali: calcolaTotali(ore, materiali),
  }
}
