/**
 * Глобальный перехватчик 401 от API.
 *
 * Без него истёкшая/невалидная сессия приводила к тому, что все запросы
 * молча падали с 401, а `loggedIn` из useUserSession() оставался закэширован
 * как true до следующей полной перезагрузки — пользователю приходилось
 * вручную чистить куки. Теперь при любом 401 сессия сбрасывается и
 * пользователь перенаправляется на /login.
 */
export default defineNuxtPlugin(() => {
  const { clear } = useUserSession()

  globalThis.$fetch = $fetch.create({
    async onResponseError({ response }) {
      if (response.status !== 401) return

      const path = useRoute().path
      if (path === '/login' || path === '/register') return

      await clear()
      await navigateTo('/login')
    }
  })
})
