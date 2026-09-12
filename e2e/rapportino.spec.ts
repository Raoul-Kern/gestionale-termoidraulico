/**
 * Il percorso che conta: il tecnico chiude il rapportino sul telefono e
 * l'ufficio lo vede con il totale giusto.
 */

import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, service, { auth: { persistSession: false } })

const PASSWORD = 'prova-1234'
const emailTecnico = 'e2e-tecnico@esempio.test'
const emailUfficio = 'e2e-ufficio@esempio.test'
const CLIENTE = 'Cliente E2E'

async function utente(email: string, ruolo: 'tecnico' | 'ufficio') {
  const { data } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })

  let id = data?.user?.id
  if (!id) {
    const { data: elenco } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    id = elenco.users.find((utente) => utente.email === email)?.id
  }
  if (!id) throw new Error(`Utente non disponibile: ${email}`)

  await admin.from('utenti').upsert({ id, nome: email, ruolo, tariffa_costo_oraria: 22 })
  return id
}

test.beforeAll(async () => {
  const tecnicoId = await utente(emailTecnico, 'tecnico')
  await utente(emailUfficio, 'ufficio')

  // Ogni esecuzione riparte pulita. L'ordine conta: interventi e sedi hanno
  // "on delete restrict", quindi cancellare prima il cliente non funziona e
  // lascerebbe dietro i lavori delle esecuzioni precedenti.
  const { data: vecchiClienti } = await admin
    .from('clienti')
    .select('id, sedi ( id )')
    .eq('ragione_sociale', CLIENTE)

  for (const vecchio of vecchiClienti ?? []) {
    const sedi = Array.isArray(vecchio.sedi) ? vecchio.sedi : [vecchio.sedi]
    for (const sedeVecchia of sedi) {
      if (!sedeVecchia) continue
      await admin.from('interventi').delete().eq('sede_id', sedeVecchia.id)
      await admin.from('sedi').delete().eq('id', sedeVecchia.id)
    }
    await admin.from('clienti').delete().eq('id', vecchio.id)
  }

  const { data: cliente } = await admin
    .from('clienti')
    .insert({ ragione_sociale: CLIENTE })
    .select('id')
    .single()

  const { data: sede } = await admin
    .from('sedi')
    .insert({ cliente_id: cliente!.id, indirizzo: 'Via E2E 1', comune: 'Brescia' })
    .select('id')
    .single()

  await admin.from('interventi').insert({
    sede_id: sede!.id,
    tecnico_id: tecnicoId,
    data: new Date().toISOString().slice(0, 10),
    ora_inizio: '09:00:00',
    descrizione: 'Intervento E2E',
  })
})

async function accedi(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra' }).click()
  // Senza questa attesa la navigazione successiva parte mentre il redirect è
  // ancora in volo e finisce di nuovo sul login.
  await page.waitForURL((indirizzo) => !indirizzo.pathname.startsWith('/login'))
}

test('il tecnico chiude il rapportino e l ufficio lo vede con il totale giusto', async ({
  page,
  browser,
}) => {
  await accedi(page, emailTecnico)
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible()
  await expect(page.getByRole('heading', { name: CLIENTE })).toBeVisible()

  await page.getByRole('link', { name: /Apri rapportino/i }).first().click()

  // 30 minuti di viaggio, 60 di ordinario.
  await page.getByRole('button', { name: 'Aggiungi 15 minuti a viaggio' }).click()
  await page.getByRole('button', { name: 'Aggiungi 15 minuti a viaggio' }).click()
  for (let tocco = 0; tocco < 4; tocco += 1) {
    await page.getByRole('button', { name: 'Aggiungi 15 minuti a ordinario' }).click()
  }

  // Due valvole a sfera da 1/2.
  await page.getByRole('button', { name: 'Materiali' }).click()
  await page.getByRole('searchbox', { name: /Cerca materiale/i }).fill('sfera 1/2')
  await page.getByRole('button', { name: /Aggiungi Valvola a sfera 1\/2/i }).click()
  await page.getByRole('button', { name: /Aumenta Valvola a sfera 1\/2/i }).click()

  await page.getByRole('button', { name: 'Note e firma' }).click()
  await page.getByLabel('Note').fill('Sostituita valvola, impianto in pressione.')
  await page.getByLabel('Firmato da').fill('Sig. Rossi')

  // Firma davvero: così il percorso copre anche il caricamento del PNG nel
  // bucket privato, che altrimenti nessun test tocca.
  const tela = page.getByLabel('Area per la firma del cliente')
  const area = await tela.boundingBox()
  if (!area) throw new Error('Area della firma non trovata')

  await page.mouse.move(area.x + 30, area.y + area.height / 2)
  await page.mouse.down()
  await page.mouse.move(area.x + 120, area.y + 30, { steps: 8 })
  await page.mouse.move(area.x + 220, area.y + area.height - 30, { steps: 8 })
  await page.mouse.up()

  // 0,5 h x 30 + 1 h x 40 + 2 x 11 = 77,00 €
  await expect(page.getByText('77,00 €').first()).toBeVisible()

  await page.getByRole('button', { name: 'Chiudi rapportino' }).click()
  await expect(page.getByRole('heading', { name: 'Oggi' })).toBeVisible()
  await expect(page.getByText('Chiuso')).toBeVisible()

  const contesto = await browser.newContext()
  const paginaUfficio = await contesto.newPage()
  await accedi(paginaUfficio, emailUfficio)
  await paginaUfficio.goto('/rapportini')

  const riga = paginaUfficio.getByRole('row').filter({ hasText: CLIENTE }).first()
  await expect(riga).toBeVisible()
  await expect(riga).toContainText('77,00 €')
  // Il badge è assente su questa riga, non nell'intera pagina: altri rapportini
  // possono legittimamente essere senza firma.
  await expect(riga.getByText('Non firmato')).toHaveCount(0)

  await contesto.close()
})
