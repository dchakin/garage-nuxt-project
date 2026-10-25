import { readFileSync } from 'node:fs'
import { buildThemeInitScript, readThemeBackgrounds } from './theme/initScript'

// Фон светлой/тёмной темы — из токенов: для theme-color, inline-скрипта темы и манифеста
const themeBackgrounds = readThemeBackgrounds(
  readFileSync(new URL('./assets/css/tokens.css', import.meta.url), 'utf8'),
)

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  devServer: {
    host: '0.0.0.0',
  },

  // Клиент — чистый SPA (см. docs/plans/mobile-stores.md, этап 1): без SSR, сборка `nuxt generate`.
  // Статику раздаёт apps/api (прод) или любой веб-сервер; в Capacitor-оболочку кладётся как есть.
  ssr: false,

  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  // Витрина UI-кита (/dev/ui) нужна в dev и e2e (там гоняется обычная `npm run build`),
  // а в прод-образ не попадает: Dockerfile собирает с GARAGE_EXCLUDE_DEV_PAGES=1
  ignore: process.env.GARAGE_EXCLUDE_DEV_PAGES ? ['pages/dev/**', 'components/dev/**'] : [],

  // Воркспейс-пакет отдаёт исходный TS — Vite должен его транспилировать
  build: {
    transpile: ['@garage/shared'],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    public: {
      // Базовый URL API. Веб: пустая строка — тот же origin (в dev запросы проксируются на apps/api,
      // см. nitro.devProxy). Мобильная сборка: абсолютный адрес прода (NUXT_PUBLIC_API_BASE=https://...).
      // При `nuxt generate` значение запекается в бандл.
      apiBase: '',
      // 'cookie' — веб (httpOnly-кука), 'token' — мобильный клиент (Bearer + refresh-токен).
      authMode: 'cookie',
    },
  },

  nitro: {
    // Только для `nuxt dev`: /api/** идёт на apps/api, так что для браузера всё остаётся на одном
    // origin и cookie-сессия работает без CORS. Цель переопределяется через NUXT_API_PROXY_TARGET.
    devProxy: {
      '/api': {
        target: process.env.NUXT_API_PROXY_TARGET || 'http://127.0.0.1:3001/api',
        changeOrigin: true,
        prependPath: true,
      },
    },
  },

  app: {
    head: {
      title: 'Гараж — учёт авто',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Гараж' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
      // Синхронно в <head>, до CSS и бандла: класс темы ставится до первой отрисовки.
      // <meta name="theme-color"> создаёт сам скрипт — статическая встала бы после него дублем
      script: [{ innerHTML: buildThemeInitScript(themeBackgrounds), tagPosition: 'head' }],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    // Свой service worker (service-worker/sw.ts) — нужен обработчик push-событий,
    // который автогенерируемый воркер (generateSW) не умеет
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    manifest: {
      name: 'Гараж — учёт авто',
      short_name: 'Гараж',
      description: 'Учёт обслуживания, ремонтов и расходов на автомобиль',
      theme_color: themeBackgrounds.light,
      background_color: themeBackgrounds.light,
      display: 'standalone',
      start_url: '/',
      lang: 'ru',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    injectManifest: {
      // Только прекэш статики приложения — API-запросы (данные пользователя)
      // намеренно не кэшируются офлайн-воркером, оффлайн-режим не входит в ТЗ.
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    },
    devOptions: {
      // Включаем SW и в dev, чтобы можно было проверить "Установить приложение" локально
      enabled: true,
      type: 'module',
    },
  },
})
