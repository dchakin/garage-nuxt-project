import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // computeNextDue строит даты через локальный Date().toISOString() (см.
    // "Ловушки" в docs/plans/conventions.md) — фиксируем UTC, иначе тесты
    // дат зависят от часового пояса машины, на которой они запущены.
    env: { TZ: 'UTC' },
    setupFiles: ['./tests/setup/node-globals.ts'],
    // Один раз собирает API; интеграционные тесты запускают готовую сборку (tests/helpers/apiServer.ts)
    globalSetup: ['./tests/setup/buildApi.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
