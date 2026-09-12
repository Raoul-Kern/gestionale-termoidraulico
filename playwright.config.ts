import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  // La prima pagina aperta paga la compilazione di Turbopack: cinque secondi di
  // attesa predefinita non bastano, e il test fallirebbe per lentezza, non per
  // un difetto.
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'telefono', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
