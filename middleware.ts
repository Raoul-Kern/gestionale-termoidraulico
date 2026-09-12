import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Percorsi raggiungibili senza sessione. */
const PUBBLICI = ['/login', '/manifest.webmanifest']

export async function middleware(request: NextRequest) {
  let risposta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (elenco) => {
          elenco.forEach(({ name, value }) => request.cookies.set(name, value))
          risposta = NextResponse.next({ request })
          elenco.forEach(({ name, value, options }) => risposta.cookies.set(name, value, options))
        },
      },
    },
  )

  // getUser, non getSession: il token va verificato, non letto dal cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pubblico = PUBBLICI.some((percorso) => request.nextUrl.pathname.startsWith(percorso))

  if (!user && !pubblico) {
    const destinazione = request.nextUrl.clone()
    destinazione.pathname = '/login'
    return NextResponse.redirect(destinazione)
  }

  return risposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)'],
}
