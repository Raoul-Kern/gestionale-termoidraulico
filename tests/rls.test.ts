/**
 * Verifica i permessi contro il database vero: le policy RLS per le righe, i
 * privilegi di colonna per i costi.
 *
 * Gli utenti di prova sono reali e restano nel progetto di sviluppo. Hanno un
 * suffisso riconoscibile, così si distinguono dagli utenti dell'azienda.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipi'
import { anonDiProva as anon, serviceDiProva as service, urlDiProva as url } from './progetto-di-prova'

const admin = createClient<Database>(url, service, { auth: { persistSession: false } })

const PASSWORD = 'prova-1234'
const email = (ruolo: string) => `prova-${ruolo}@esempio.test`

type Sessione = SupabaseClient<Database>

async function utenteDiProva(ruolo: 'tecnico' | 'ufficio' | 'titolare'): Promise<Sessione> {
  const indirizzo = email(ruolo)

  const { data: creato, error } = await admin.auth.admin.createUser({
    email: indirizzo,
    password: PASSWORD,
    email_confirm: true,
  })

  let id = creato?.user?.id
  if (!id) {
    if (!error?.message.match(/already|registered|exists/i)) throw error
    const { data: elenco } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    id = elenco.users.find((u) => u.email === indirizzo)?.id
  }
  if (!id) throw new Error(`Utente di prova non trovato: ${indirizzo}`)

  await admin
    .from('utenti')
    .upsert({ id, nome: `Prova ${ruolo}`, ruolo, tariffa_costo_oraria: 22 })

  const sessione = createClient<Database>(url, anon, { auth: { persistSession: false } })
  const { error: erroreLogin } = await sessione.auth.signInWithPassword({
    email: indirizzo,
    password: PASSWORD,
  })
  if (erroreLogin) throw erroreLogin

  return sessione
}

let tecnico: Sessione
let ufficio: Sessione
let titolare: Sessione

beforeAll(async () => {
  tecnico = await utenteDiProva('tecnico')
  ufficio = await utenteDiProva('ufficio')
  titolare = await utenteDiProva('titolare')
}, 60_000)

describe('colonne di costo', () => {
  it('il tecnico non legge il prezzo di acquisto dei materiali', async () => {
    const { error } = await tecnico.from('materiali').select('prezzo_acquisto').limit(1)
    expect(error).not.toBeNull()
  })

  it('il tecnico legge il prezzo di vendita dei materiali', async () => {
    const { error } = await tecnico.from('materiali').select('codice,prezzo_vendita').limit(1)
    expect(error).toBeNull()
  })

  it("l'ufficio non legge la tariffa di costo dei tecnici", async () => {
    const { error } = await ufficio.from('utenti').select('tariffa_costo_oraria').limit(1)
    expect(error).not.toBeNull()
  })

  it('nemmeno il titolare legge i costi in query diretta: authenticated è un solo ruolo', async () => {
    const { error } = await titolare.from('materiali').select('prezzo_acquisto').limit(1)
    expect(error).not.toBeNull()
  })

  it('il titolare legge i costi dalla funzione dedicata, gli altri no', async () => {
    const perTitolare = await titolare.rpc('listino_con_costi')
    const perUfficio = await ufficio.rpc('listino_con_costi')

    expect(perTitolare.error).toBeNull()
    expect((perTitolare.data ?? []).length).toBeGreaterThan(0)
    expect(perUfficio.data ?? []).toHaveLength(0)
  })

  it('solo il titolare ottiene righe da margini()', async () => {
    const periodo = { dal: '2026-01-01', al: '2026-12-31' }
    const perUfficio = await ufficio.rpc('margini', periodo)
    const perTitolare = await titolare.rpc('margini', periodo)

    expect(perUfficio.data ?? []).toHaveLength(0)
    expect(perTitolare.error).toBeNull()
  })
})

describe('righe visibili per ruolo', () => {
  it('il tecnico non vede gli interventi di altri tecnici', async () => {
    const { data: altro } = await admin
      .from('utenti')
      .select('id')
      .eq('nome', 'Prova ufficio')
      .single()

    const { data: cliente } = await admin
      .from('clienti')
      .insert({ ragione_sociale: 'RLS Spa' })
      .select('id')
      .single()
    const { data: sede } = await admin
      .from('sedi')
      .insert({ cliente_id: cliente!.id, indirizzo: 'Via RLS 1' })
      .select('id')
      .single()

    await admin.from('interventi').insert({
      sede_id: sede!.id,
      tecnico_id: altro!.id,
      data: '2026-06-01',
      descrizione: 'Non mio',
    })

    const { data } = await tecnico
      .from('interventi')
      .select('id,descrizione')
      .eq('descrizione', 'Non mio')

    expect(data ?? []).toHaveLength(0)

    await admin.from('clienti').delete().eq('id', cliente!.id)
  })

  it("l'ufficio vede tutti gli interventi", async () => {
    const { error } = await ufficio.from('interventi').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('un utente non autenticato non vede niente', async () => {
    const anonimo = createClient<Database>(url, anon, { auth: { persistSession: false } })
    const { data } = await anonimo.from('clienti').select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
