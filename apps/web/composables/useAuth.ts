import type { AuthMode } from '@garage/shared/schemas/auth'
import type { AuthResponse, AuthUser } from '@garage/shared/types'

/**
 * Состояние авторизации клиента. Заменяет useUserSession из nuxt-auth-utils: веб живёт на
 * httpOnly-куке, мобильная сборка (authMode: 'token') — на Bearer-токенах из localTokenStore.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loggedIn = computed(() => user.value !== null)
  const authMode = useRuntimeConfig().public.authMode as AuthMode

  function storeSession(response: AuthResponse) {
    if (response.tokens) localTokenStore.write(response.tokens)
    user.value = { id: response.id, email: response.email, name: response.name }
    return user.value
  }

  /** Подтягивает текущего пользователя с сервера (при старте приложения). */
  async function fetchSession() {
    if (authMode === 'token' && !localTokenStore.read()) {
      user.value = null
      return
    }
    user.value = await $fetch<AuthUser | null>('/api/auth/session').catch(() => null)
  }

  async function login(email: string, password: string) {
    const response = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password, authMode },
    })
    return storeSession(response)
  }

  async function register(name: string, email: string, password: string) {
    const response = await $fetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password, authMode },
    })
    return storeSession(response)
  }

  /** Просит сервер отправить письмо со ссылкой сброса (всегда 204, есть ли такой email — не видно). */
  async function requestPasswordReset(email: string) {
    await $fetch('/api/auth/password-reset', { method: 'POST', body: { email } })
  }

  /** Задаёт новый пароль по токену из письма и сразу входит (как `login`). */
  async function confirmPasswordReset(token: string, password: string) {
    const response = await $fetch<AuthResponse>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, password, authMode },
    })
    return storeSession(response)
  }

  /** Сбрасывает локальное состояние сессии, не обращаясь к серверу. */
  function clear() {
    localTokenStore.clear()
    user.value = null
  }

  async function logout() {
    const refreshToken = localTokenStore.read()?.refreshToken
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : undefined,
      })
    } finally {
      clear()
    }
  }

  return {
    user,
    loggedIn,
    fetch: fetchSession,
    login,
    register,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    clear,
  }
}
