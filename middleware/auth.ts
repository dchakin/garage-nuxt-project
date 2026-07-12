export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  const publicPages = ['/login', '/register']
  if (!loggedIn.value && !publicPages.includes(to.path)) {
    return navigateTo('/login')
  }
  if (loggedIn.value && publicPages.includes(to.path)) {
    return navigateTo('/cars')
  }
})
