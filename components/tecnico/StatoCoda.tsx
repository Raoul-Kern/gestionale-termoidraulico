'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { elaboraCoda, leggiCoda } from '@/lib/bozza'
import { chiudiRapportino } from '@/app/(tecnico)/rapportino/azioni'

/** Avvisa il tecnico che qualcosa non è ancora arrivato in ufficio. */
export function StatoCoda() {
  const [inAttesa, setInAttesa] = useState(0)
  const [rifiutati, setRifiutati] = useState(0)
  const [inInvio, setInInvio] = useState(false)

  const aggiorna = useCallback(async () => {
    setInAttesa((await leggiCoda()).length)
  }, [])

  const svuota = useCallback(async () => {
    setInInvio(true)
    try {
      const esito = await elaboraCoda(async (bozza) => {
        await chiudiRapportino(bozza)
      })
      setRifiutati(esito.rifiutati)
    } finally {
      setInInvio(false)
      await aggiorna()
    }
  }, [aggiorna])

  useEffect(() => {
    void aggiorna()

    const alRitornoRete = () => void svuota()
    window.addEventListener('online', alRitornoRete)
    if (navigator.onLine) void svuota()

    return () => window.removeEventListener('online', alRitornoRete)
  }, [aggiorna, svuota])

  if (rifiutati > 0) {
    return (
      <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {rifiutati === 1
          ? 'Un rapportino non è stato inviato: l’ufficio l’aveva già corretto. Chiamalo prima di rifarlo.'
          : `${rifiutati} rapportini non sono stati inviati: l’ufficio li aveva già corretti.`}
      </p>
    )
  }

  if (inAttesa === 0) return null

  return (
    <button
      type="button"
      onClick={() => void svuota()}
      disabled={inInvio}
      className="flex w-full items-center gap-3 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm text-amber-900"
    >
      {inInvio ? (
        <RefreshCw className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <CloudOff className="size-5" aria-hidden="true" />
      )}
      {inAttesa === 1
        ? '1 rapportino in attesa di invio. Tocca per riprovare.'
        : `${inAttesa} rapportini in attesa di invio. Tocca per riprovare.`}
    </button>
  )
}
