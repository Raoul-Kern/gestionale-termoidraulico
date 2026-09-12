import { redirect } from 'next/navigation'
import { clientServer } from './supabase/server'
import type { Ruolo } from './supabase/tipi'

/**
 * Le colonne che un utente autenticato può leggere di sé. Un select('*') qui
 * fallirebbe: tariffa_costo_oraria è revocata a tutti, titolare compreso, e
 * l'errore si presenterebbe come "nessun utente", cioè come un rimbalzo al
 * login senza spiegazione.
 */
const COLONNE_VISIBILI = 'id, nome, ruolo, colore, attivo, creato_il, aggiornato_il'

export type UtenteInSessione = {
  id: string
  nome: string
  ruolo: Ruolo
  colore: string
  attivo: boolean
}

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

export async function utenteCorrente(): Promise<UtenteInSessione | null> {
  const supabase = await clientServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('utenti')
    .select(COLONNE_VISIBILI)
    .eq('id', user.id)
    .single()
  return data ?? null
}

/**
 * Reindirizza chi non ha il ruolo giusto. È una comodità di navigazione, non una
 * barriera: i permessi veri stanno nelle policy del database.
 */
export async function richiediRuolo(ruoli: Ruolo[]): Promise<UtenteInSessione> {
  const utente = await utenteCorrente()
  if (!utente) redirect('/login')
  if (!ruoli.includes(utente.ruolo)) redirect(homePerRuolo(utente.ruolo))
  return utente
}
