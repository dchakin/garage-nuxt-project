/** Страницы только для гостей: вошедшего отсюда уводит на список машин. */
const GUEST_ONLY_PAGES = ['/login', '/register', '/forgot-password']
/** Доступны всем: ссылка из письма сброса может открыться и в браузере, где уже есть сессия. */
const OPEN_PAGES = ['/reset-password']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()

  if (OPEN_PAGES.includes(to.path)) return
  if (!loggedIn.value && !GUEST_ONLY_PAGES.includes(to.path)) {
    return navigateTo('/login')
  }
  if (loggedIn.value && GUEST_ONLY_PAGES.includes(to.path)) {
    return navigateTo('/cars')
  }
})
