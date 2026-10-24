/** Куда ведёт вход, если `redirect` не передан или небезопасен. */
export const DEFAULT_AFTER_LOGIN = '/cars'

/** Параметр запроса `/login?redirect=…`: маршрут, на который вернуть после входа. */
export const REDIRECT_QUERY_KEY = 'redirect'

const AUTH_PAGES = ['/login', '/register']

/**
 * Принимает `redirect` только если это путь внутри приложения: начинается с одного `/`
 * (не `//host` и не `/\host`) и не ведёт обратно на экраны входа. Иначе — `fallback`.
 */
export function safeRedirect(value: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\'))
    return fallback
  if (AUTH_PAGES.includes(target.split(/[?#]/)[0])) return fallback
  return target
}

/**
 * Адрес входа с сохранением маршрута: `/login?redirect=%2Fcars%2F7%2Fjournal`.
 * Корень `/` не сохраняется — он и так ведёт на «Обзор» последней машины.
 */
export function loginLocation(redirectTo: string): string {
  const target = safeRedirect(redirectTo, '')
  if (!target || target === '/') return '/login'
  return `/login?${REDIRECT_QUERY_KEY}=${encodeURIComponent(target)}`
}
