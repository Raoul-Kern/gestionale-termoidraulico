/**
 * Chiusura del rapportino contro il database vero: prezzi presi dal listino,
 * idempotenza sul reinvio, rifiuto di una bozza sorpassata.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/tipi'
import { anonDiProva as anon, serviceDiProva as service, urlDiProva as url } from './progetto-di-prova'

const admin = createClient<Database>(url, service, { auth: { persistSession: false } })

let tecnico: SupabaseClient<Database>
let interventoId: string
let clienteId: string
let materialeId: string

const ore = [
  { tipo: 'viaggio', minuti: 30 },
  { tipo: 'ordinario', minuti: 90 },
]

beforeAll(async () => {
  const indirizzo = `prova-chiusura-${Date.now()}@esempio.test`
  const { data: creato, error } = await admin.auth.admin.createUser({
    email: indirizzo,
    password: 'prova-1234',
    email_confirm: true,
  })
  if (error || !creato?.user) throw error ?? new Error('Utente non creato')
  const tecnicoId = creato.user.id

  await admin.from('utenti').upsert({
    id: tecnicoId,
    nome: 'Tecnico chiusura',
    ruolo: 'tecnico',
    tariffa_costo_oraria: 22,
  })

  const { data: cliente } = await admin
    .from('clienti')
    .insert({ ragione_sociale: 'Chiusura Srl' })
    .select('id')
    .single()
  clienteId = cliente!.id

  const { data: sede } = await admin
    .from('sedi')
    .insert({ cliente_id: clienteId, indirizzo: 'Via Chiusura 1' })
    .select('id')
    .single()

  const { data: intervento } = await admin
    .from('interventi')
    .insert({
      sede_id: sede!.id,
      tecnico_id: tecnicoId,
      data: '2026-09-12',
      descrizione: 'Sostituzione valvola',
    })
    .select('id')
    .single()
  interventoId = intervento!.id

  const { data: materiale } = await admin
    .from('materiali')
    .select('id')
    .eq('codice', 'VAL-SFE-12')
    .single()
  materialeId = materiale!.id

  tecnico = createClient<Database>(url, anon, { auth: { persistSession: false } })
  const { error: erroreLogin } = await tecnico.auth.signInWithPassword({
    email: indirizzo,
    password: 'prova-1234',
  })
  if (erroreLogin) throw erroreLogin
}, 60_000)

function chiudi(note: string, bozzaAggiornataIl?: string) {
  return tecnico.rpc('chiudi_rapportino', {
    p_intervento_id: interventoId,
    p_note: note,
    p_firmatario: 'Sig. Rossi',
    p_ore: ore,
    p_materiali: [{ materiale_id: materialeId, quantita: 2 }],
    p_bozza_aggiornata_il: bozzaAggiornataIl,
  })
}

describe('chiudi_rapportino', () => {
  it('crea il rapportino con le tariffe del database e chiude l intervento', async () => {
    const { data, error } = await chiudi('Prima chiusura')
    expect(error).toBeNull()
    expect(data).toBeTruthy()

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('tipo,minuti,prezzo_orario,costo_orario')
      .eq('rapportino_id', data as string)

    expect(righeOre).toHaveLength(2)
    expect(Number(righeOre!.find((r) => r.tipo === 'viaggio')!.prezzo_orario)).toBe(30)
    expect(Number(righeOre!.find((r) => r.tipo === 'ordinario')!.prezzo_orario)).toBe(40)
    expect(righeOre!.every((r) => Number(r.costo_orario) === 22)).toBe(true)

    const { data: intervento } = await admin
      .from('interventi')
      .select('stato')
      .eq('id', interventoId)
      .single()
    expect(intervento!.stato).toBe('chiuso')
  })

  it('il secondo invio aggiorna invece di duplicare', async () => {
    const primo = await chiudi('Prima chiusura')
    const secondo = await chiudi('Seconda chiusura')

    expect(secondo.data).toBe(primo.data)

    const { count } = await admin
      .from('rapportini')
      .select('id', { count: 'exact', head: true })
      .eq('intervento_id', interventoId)
    expect(count).toBe(1)

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('id')
      .eq('rapportino_id', secondo.data as string)
    expect(righeOre).toHaveLength(2)

    const { data: rapportino } = await admin
      .from('rapportini')
      .select('note')
      .eq('intervento_id', interventoId)
      .single()
    expect(rapportino!.note).toBe('Seconda chiusura')
  })

  it('congela il prezzo del materiale al momento della chiusura', async () => {
    const rapportinoId = (await chiudi('Congelamento')).data as string

    const { data: prima } = await admin
      .from('rapportino_materiali')
      .select('prezzo_vendita')
      .eq('rapportino_id', rapportinoId)
      .single()

    await admin.from('materiali').update({ prezzo_vendita: 999 }).eq('id', materialeId)

    const { data: dopo } = await admin
      .from('rapportino_materiali')
      .select('prezzo_vendita')
      .eq('rapportino_id', rapportinoId)
      .single()

    expect(Number(dopo!.prezzo_vendita)).toBe(Number(prima!.prezzo_vendita))
    expect(Number(dopo!.prezzo_vendita)).not.toBe(999)

    await admin.from('materiali').update({ prezzo_vendita: 11 }).eq('id', materialeId)
  })

  it('rifiuta una bozza più vecchia dell ultima modifica in ufficio', async () => {
    await chiudi('Chiusura del tecnico')

    await admin
      .from('rapportini')
      .update({ note: 'Corretto in ufficio' })
      .eq('intervento_id', interventoId)

    const vecchia = new Date(Date.now() - 86_400_000).toISOString()
    const esito = await chiudi('Reinvio di una bozza vecchia', vecchia)

    expect(esito.error).not.toBeNull()
    expect(esito.error!.message).toMatch(/già modificato in ufficio/i)

    const { data: rapportino } = await admin
      .from('rapportini')
      .select('note')
      .eq('intervento_id', interventoId)
      .single()
    expect(rapportino!.note).toBe('Corretto in ufficio')
  })

  it('scarta le righe con minuti o quantità a zero', async () => {
    const { data } = await tecnico.rpc('chiudi_rapportino', {
      p_intervento_id: interventoId,
      p_note: 'Righe vuote',
      p_firmatario: '',
      p_ore: [
        { tipo: 'viaggio', minuti: 0 },
        { tipo: 'ordinario', minuti: 45 },
      ],
      p_materiali: [
        { materiale_id: null, descrizione: 'Sigillante', quantita: 0, prezzo_vendita: 5 },
      ],
    })

    const { data: righeOre } = await admin
      .from('rapportino_ore')
      .select('minuti')
      .eq('rapportino_id', data as string)
    expect(righeOre).toHaveLength(1)
    expect(righeOre![0].minuti).toBe(45)

    const { data: righeMateriali } = await admin
      .from('rapportino_materiali')
      .select('id')
      .eq('rapportino_id', data as string)
    expect(righeMateriali).toHaveLength(0)
  })

  it('un tecnico non può chiudere l intervento di un altro', async () => {
    const { data: altroCliente } = await admin
      .from('clienti')
      .insert({ ragione_sociale: 'Altro Srl' })
      .select('id')
      .single()
    const { data: altraSede } = await admin
      .from('sedi')
      .insert({ cliente_id: altroCliente!.id, indirizzo: 'Via Altrui 9' })
      .select('id')
      .single()

    const { data: altroUtente } = await admin
      .from('utenti')
      .select('id')
      .eq('nome', 'Prova ufficio')
      .single()

    const { data: altroIntervento } = await admin
      .from('interventi')
      .insert({
        sede_id: altraSede!.id,
        tecnico_id: altroUtente!.id,
        data: '2026-09-12',
        descrizione: 'Non mio',
      })
      .select('id')
      .single()

    const esito = await tecnico.rpc('chiudi_rapportino', {
      p_intervento_id: altroIntervento!.id,
      p_note: 'Provo a chiudere il lavoro di un collega',
      p_firmatario: '',
      p_ore: [{ tipo: 'ordinario', minuti: 60 }],
      p_materiali: [],
    })

    expect(esito.error).not.toBeNull()

    await admin.from('clienti').delete().eq('id', altroCliente!.id)
  })
})
