import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  compatibilityDate: '2024-11-01',
  srcDir: 'server',

  runtimeConfig: {
    // Переменные окружения продолжают называться NUXT_* (NUXT_SESSION_PASSWORD, NUXT_VAPID_*, ...),
    // как до разделения на apps/web и apps/api — серверный .env и docker-compose не меняются.
    nitro: { envPrefix: 'NUXT_' },

    // Web Push (VAPID): NUXT_PUBLIC_VAPID_PUBLIC_KEY / NUXT_VAPID_PRIVATE_KEY / NUXT_VAPID_SUBJECT
    vapidPrivateKey: '',
    vapidSubject: 'mailto:admin@example.com',
    public: {
      vapidPublicKey: '',
    },

    // Дополнительные origin'ы для CORS через запятую (NUXT_CORS_ORIGINS). Origin'ы Capacitor
    // (capacitor://localhost, https://localhost) разрешены всегда, см. server/middleware/cors.ts.
    corsOrigins: '',

    // Каталог со сборкой apps/web (`nuxt generate` → .output/public). Если задан (NUXT_WEB_DIST_DIR),
    // API раздаёт и статику клиента — один контейнер и один origin на проде. В dev не нужен.
    webDistDir: '',

    session: {
      // Имя куки сохранено от nuxt-auth-utils, чтобы уже выданные сессии остались валидными
      name: 'nuxt-session',
      // NUXT_SESSION_PASSWORD, 32+ случайных символа; из него же выводится ключ access-токенов
      password: '',
      // 30 дней — явный срок жизни сессии, чтобы не зависеть от дефолтов h3
      maxAge: 60 * 60 * 24 * 30,
      cookie: {
        sameSite: 'lax',
        // secure: false по умолчанию — иначе кука не сохраняется при доступе по http
        // с других устройств (например, http://192.168.x.x с телефона) в dev.
        // За https (прод, см. docker-compose.yml) включается через NUXT_SESSION_COOKIE_SECURE=true.
        secure: false,
      },
    },
  },

  experimental: {
    wasm: false,
    tasks: true,
  },

  // Ежедневная проверка напоминаний: 06:00 UTC = 09:00 МСК
  scheduledTasks: {
    '0 6 * * *': ['reminders:notify'],
  },

  // Воркспейс-пакет отдаёт исходный TS — его нужно собрать вместе с сервером, а не оставлять внешним
  externals: { inline: ['@garage/shared'] },
})
