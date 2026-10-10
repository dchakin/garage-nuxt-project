import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    // Те же алиасы, что в Nuxt: ~ и @ — корень приложения
    alias: { '~': root, '@': root },
  },
  test: {
    name: 'web',
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    env: { TZ: 'UTC' },
  },
})
