import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~~': root,
      '@@': root,
      '~': root,
      '@': root
    }
  },
  test: {
    // computeNextDue строит даты через локальный Date().toISOString() (см.
    // "Ловушки" в docs/plans/conventions.md) — фиксируем UTC, иначе тесты
    // дат зависят от часового пояса машины, на которой они запущены.
    env: { TZ: 'UTC' },
    setupFiles: ['./tests/setup/node-globals.ts'],
    testTimeout: 30000,
    hookTimeout: 180000,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/nuxt/**']
        }
      },
      {
        extends: true,
        test: {
          // Компоненты/composables (когда появятся) гоняются в happy-dom
          name: 'nuxt',
          environment: 'happy-dom',
          include: ['tests/nuxt/**/*.test.ts']
        }
      }
    ]
  }
})
