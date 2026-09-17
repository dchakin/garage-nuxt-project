export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  devServer: {
    host: '0.0.0.0'
  },

  modules: ['@nuxtjs/tailwindcss', 'nuxt-auth-utils', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false
  },

  runtimeConfig: {
    dbFileName: process.env.DB_FILE_NAME || 'server/database/garage.db',
    session: {
      // 30 дней — явный срок жизни сессии, чтобы не зависеть от дефолтов модуля
      maxAge: 60 * 60 * 24 * 30,
      cookie: {
        sameSite: 'lax',
        // secure: false по умолчанию — иначе кука не сохраняется при доступе по http
        // с других устройств (например, http://192.168.x.x с телефона) в dev.
        // За https (прод, см. docker-compose.yml) включается через NUXT_SESSION_COOKIE_SECURE=true.
        secure: process.env.NUXT_SESSION_COOKIE_SECURE === 'true'
      }
    }
  },

  nitro: {
    experimental: {
      wasm: false
    }
  },

  app: {
    head: {
      title: 'Гараж — учёт авто',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#4f46e5' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Гараж' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' }
      ]
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Гараж — учёт авто',
      short_name: 'Гараж',
      description: 'Учёт обслуживания, ремонтов и расходов на автомобиль',
      theme_color: '#4f46e5',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      lang: 'ru',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      // Только прекэш статики приложения — API-запросы (данные пользователя)
      // намеренно не кэшируются офлайн-воркером, оффлайн-режим не входит в ТЗ.
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    },
    devOptions: {
      // Включаем SW и в dev, чтобы можно было проверить "Установить приложение" локально
      enabled: true,
      type: 'module'
    }
  }
})
