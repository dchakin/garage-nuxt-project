import { defineConfig, devices } from '@playwright/test'

// E2E по собранному приложению: перед запуском нужен `npm run build` (см. tests/e2e/server.mjs).
const port = Number(process.env.E2E_PORT || 3100)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'tests/e2e',
  // Скриншоты snap() лежат в test-results/screens/; трейсы и прочее — отдельно, Playwright чистит этот каталог
  outputDir: 'test-results/artifacts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 390, height: 844 },
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    colorScheme: 'light',
    // PWA service worker кеширует бандл между тестами — в e2e не нужен
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { E2E_PORT: String(port) },
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
