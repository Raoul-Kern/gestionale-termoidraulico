import type { Metadata, Viewport } from 'next'
import { Archivo, Source_Sans_3 } from 'next/font/google'
import './globals.css'

const titoli = Archivo({
  variable: '--font-titoli',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const testo = Source_Sans_3({
  variable: '--font-testo',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Rapportini',
  description:
    'Rapportini digitali, planning giornaliero e scadenzario manutenzioni per un’azienda termoidraulica.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#27705c',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="it"
      className={`${titoli.variable} ${testo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
