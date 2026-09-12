'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'

/**
 * L'unico punto in cui lo stato diventa "fatturato". L'export non lo tocca: una
 * stampa si annulla e un download si interrompe, e un rapportino marcato senza
 * fattura emessa è un lavoro che nessuno rifattura più.
 */
export async function segnaFatturato(rapportinoId: string) {
  const supabase = await clientServer()

  const { error } = await supabase
    .from('rapportini')
    .update({ stato_fatturazione: 'fatturato' })
    .eq('id', rapportinoId)

  if (error) throw new Error(error.message)

  revalidatePath('/rapportini')
  revalidatePath(`/rapportini/${rapportinoId}`)
}
