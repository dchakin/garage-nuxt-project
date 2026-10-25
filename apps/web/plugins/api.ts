/**
 * Клиент API и стартовая загрузка сессии.
 *
 * Подменяет глобальный $fetch: все composables ходят в `/api/...` через него, а он добавляет
 * базовый URL (NUXT_PUBLIC_API_BASE), Bearer-токен в token-режиме и обрабатывает 401.
 * Без перехвата истёкшая сессия приводила к тому, что все запросы молча падали с 401, а
 * `loggedIn` оставался true до перезагрузки. Теперь при окончательном 401 сессия сбрасывается
 * и показывается экран «Сессия истекла» (И7, `error.vue`) с маршрутом для возврата после входа.
 *
 * Плагин асинхронный: Nuxt дожидается загрузки сессии до первой навигации, поэтому
 * middleware `auth` сразу видит актуальный `loggedIn`.
 */
const PUBLIC_PAGES = ['/login', '/register']

export default defineNuxtPlugin(async () => {
  const { public: config } = useRuntimeConfig()
  const { fetch: fetchSession, clear } = useAuth()
  const router = useRouter()
  const currentError = useError()

  const apiClient = createApiClient({
    baseURL: String(config.apiBase || ''),
    authMode: config.authMode as 'cookie' | 'token',
    tokens: localTokenStore,
    onUnauthorized() {
      clear()
      const current = router.currentRoute.value
      // Параллельные 401 и экран ошибки уже на месте — один И7
      if (PUBLIC_PAGES.includes(current.path) || currentError.value) return
      showError(createError({ statusCode: 401, fatal: true, data: { redirect: current.fullPath } }))
    },
  })
  globalThis.$fetch = apiClient as unknown as typeof $fetch

  await fetchSession()
})
