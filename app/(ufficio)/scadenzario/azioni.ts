'use server'

import { revalidatePath } from 'next/cache'
import { clientServer } from '@/lib/supabase/server'

export async function registraManutenzione(impiantoId: string, data: string) {
  const supabase = await clientServer()

  // Si scrive solo l'ultima manutenzione: prossima_manutenzione la calcola il
  // database dalla colonna generata.
  const { error } = await supabase
    .from('impianti')
    .update({ ultima_manutenzione: data })
    .eq('id', impiantoId)

  if (error) throw new Error(error.message)
  revalidatePath('/scadenzario')
}
