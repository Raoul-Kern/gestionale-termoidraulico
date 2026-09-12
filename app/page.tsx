import { redirect } from 'next/navigation'
import { homePerRuolo, utenteCorrente } from '@/lib/sessione'

export default async function Home() {
  const utente = await utenteCorrente()
  redirect(utente ? homePerRuolo(utente.ruolo) : '/login')
}
