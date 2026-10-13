import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // Компонентные тесты (tests/ui) монтируют .vue-файлы через @vue/test-utils
  plugins: [vue()],
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
