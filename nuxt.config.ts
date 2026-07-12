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
    dbFileName: process.env.DB_FILE_NAME || 'server/database/garage.db'
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
