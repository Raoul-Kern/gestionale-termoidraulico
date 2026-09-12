import { redirect } from 'next/navigation'
import { clientServer } from './supabase/server'
import type { Ruolo, Utente } from './supabase/tipi'

/** Prima schermata utile per ogni ruolo: il tecnico non ha niente da fare sul planning. */
export function homePerRuolo(ruolo: Ruolo): string {
  switch (ruolo) {
    case 'tecnico':
      return '/oggi'
    case 'ufficio':
      return '/planning'
    case 'titolare':
      return '/dashboard'
  }
}

export async function utenteCorrente(): Promise<Utente | null> {
  const supabase = await clientServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('utenti').select('*').eq('id', user.id).single()
  return data ?? null
}

/**
 * Reindirizza chi non ha il ruolo giusto. È una comodità di navigazione, non una
 * barriera: i permessi veri stanno nelle policy del database.
 */
export async function richiediRuolo(ruoli: Ruolo[]): Promise<Utente> {
  const utente = await utenteCorrente()
  if (!utente) redirect('/login')
  if (!ruoli.includes(utente.ruolo)) redirect(homePerRuolo(utente.ruolo))
  return utente
}
