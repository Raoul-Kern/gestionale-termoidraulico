import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rapportini — gestionale termoidraulico',
    short_name: 'Rapportini',
    description: 'Rapportini, planning e scadenzario manutenzioni.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f4',
    theme_color: '#27705c',
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
