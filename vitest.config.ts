import { defineConfig } from 'vitest/config'

// Каждый воркспейс описывает свой проект (окружение, setup-файлы) в собственном vitest.config.ts
export default defineConfig({
  test: {
    projects: ['apps/api', 'apps/web', 'packages/shared'],
  },
})
