import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Фиксируем UTC, иначе тесты дат (getReminderStatus, todayIso) зависят от
    // часового пояса машины, на которой они запущены.
    env: { TZ: 'UTC' },
    setupFiles: ['./tests/setup/node-globals.ts'],
    // Один раз собирает API; интеграционные тесты запускают готовую сборку (tests/helpers/apiServer.ts)
    globalSetup: ['./tests/setup/buildApi.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
