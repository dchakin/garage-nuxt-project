export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  devServer: {
    host: '0.0.0.0'
  },

  modules: ['@nuxtjs/tailwindcss', 'nuxt-auth-utils'],

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
        // secure: false — иначе кука не сохраняется при доступе по http
        // с других устройств (например, http://192.168.x.x с телефона).
        // При деплое за https стоит вернуть true (или вынести в env).
        secure: false
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
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
