import { handleCors } from 'h3'

// Origin'ы WebView Capacitor: iOS — capacitor://localhost, Android — https://localhost
// (androidScheme: 'https'; http://localhost — на случай схемы по умолчанию старых версий)
const CAPACITOR_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost']
const PREFLIGHT_MAX_AGE_SECONDS = 60 * 60 * 24

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  const extraOrigins = String(useRuntimeConfig().corsOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  // Веб ходит на API с того же origin (без CORS), мобильное приложение — с origin'а WebView.
  // Для preflight handleCors сам отвечает 204 и завершает запрос.
  const preflightHandled = handleCors(event, {
    origin: [...CAPACITOR_ORIGINS, ...extraOrigins],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: String(PREFLIGHT_MAX_AGE_SECONDS),
    preflight: { statusCode: 204 },
  })
  if (preflightHandled) return true
})
