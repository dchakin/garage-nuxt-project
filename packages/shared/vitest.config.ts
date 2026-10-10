import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'shared',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // getReminderStatus сравнивает даты — фиксируем UTC, как и в apps/api
    env: { TZ: 'UTC' },
  },
})
