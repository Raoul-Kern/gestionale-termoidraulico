'use server'

import { redirect } from 'next/navigation'
import { clientServer } from '@/lib/supabase/server'
import { homePerRuolo } from '@/lib/sessione'

export type EsitoAccesso = { errore: string } | null

export async function accedi(_precedente: EsitoAccesso, dati: FormData): Promise<EsitoAccesso> {
  const email = String(dati.get('email') ?? '').trim()
  const password = String(dati.get('password') ?? '')

  const supabase = await clientServer()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Messaggio unico: distinguere "utente inesistente" da "password sbagliata"
  // direbbe a chi prova quali indirizzi esistono.
  if (error || !data.user) return { errore: 'Email o password non validi.' }

  const { data: utente } = await supabase
    .from('utenti')
    .select('ruolo')
    .eq('id', data.user.id)
    .single()

  redirect(homePerRuolo(utente?.ruolo ?? 'tecnico'))
}
