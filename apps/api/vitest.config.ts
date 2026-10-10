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
    // Интеграционные тесты поднимают по dev-серверу Nitro; параллельные серверы дерутся за общий
    // каталог .nitro и часть из них не стартует — файлы идут по очереди
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 180000,
  },
})
