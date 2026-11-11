import { defineConfig, devices } from '@playwright/test';

/**
 * Testes ponta a ponta: sobe o Next.js com um banco PGlite novo e isolado
 * e uma conta administrativa de teste (definida só para esta execução).
 */
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/warmup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `rm -rf "$HOME/.orts-agenda/pglite-e2e" && next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PGLITE_DATA_DIR: 'pglite-e2e',
      ADMIN_USERNAME: 'teste.e2e',
      ADMIN_PASSWORD: 'SenhaDeTeste#2026',
      ADMIN_NAME: 'Teste E2E',
      APP_ORIGIN: `http://localhost:${PORT}`,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
