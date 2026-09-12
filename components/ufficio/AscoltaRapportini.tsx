'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clientBrowser } from '@/lib/supabase/client'

/** Ricarica la lista quando un tecnico chiude un rapportino. */
export function AscoltaRapportini() {
  const router = useRouter()

  useEffect(() => {
    const supabase = clientBrowser()

    const canale = supabase
      .channel('rapportini-in-arrivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rapportini' },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canale)
    }
  }, [router])

  return null
}
