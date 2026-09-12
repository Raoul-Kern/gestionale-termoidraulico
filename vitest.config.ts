import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    // I test dei permessi parlano con Supabase: servono le chiavi di .env.local.
    env: loadEnv('test', process.cwd(), ''),
    environment: 'jsdom',
    // I test che parlano con Supabase attraversano la rete: 5 secondi non
    // bastano per una manciata di andate e ritorno.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
