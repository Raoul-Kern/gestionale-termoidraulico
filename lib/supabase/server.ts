import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './tipi'

export async function clientServer() {
  const store = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (elenco) => {
          try {
            elenco.forEach(({ name, value, options }) => store.set(name, value, options))
          } catch {
            // Chiamato da un Server Component: il rinnovo del cookie lo fa il
            // middleware, qui si ignora.
          }
        },
      },
    },
  )
}
