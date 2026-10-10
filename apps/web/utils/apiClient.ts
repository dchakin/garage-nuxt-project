import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import type { AuthMode } from '@garage/shared/schemas/auth'
import type { AuthTokens } from '@garage/shared/types'
import type { TokenStore } from './authTokens'

export interface ApiClientOptions {
  /** Базовый URL API: '' — тот же origin (веб), иначе абсолютный адрес (мобильная сборка). */
  baseURL: string
  authMode: AuthMode
  tokens: TokenStore
  /** Сессия окончательно недействительна (401 и обновить токен не удалось). */
  onUnauthorized: () => void | Promise<void>
}

const AUTH_PATH_PREFIX = '/api/auth/'
const REFRESH_PATH = '/api/auth/refresh'
const HTTP_UNAUTHORIZED = 401

function isUnauthorized(error: unknown): boolean {
  return (error as { statusCode?: number } | null)?.statusCode === HTTP_UNAUTHORIZED
}

/**
 * Клиент API поверх ofetch: базовый URL из конфига, `Authorization: Bearer` в token-режиме,
 * один повтор запроса после прозрачного обновления access-токена по refresh-токену.
 * Запросы на /api/auth/* (логин с неверным паролем тоже даёт 401) обработке 401 не подлежат.
 */
export function createApiClient(options: ApiClientOptions) {
  const isTokenMode = options.authMode === 'token'

  const base = ofetch.create({
    baseURL: options.baseURL,
    // Кросс-доменный веб-клиент (cookie-режим с абсолютным apiBase) должен слать куки
    credentials: !isTokenMode && options.baseURL ? 'include' : undefined,
    onRequest({ options: requestOptions }) {
      const tokens = isTokenMode ? options.tokens.read() : null
      if (!tokens) return
      const headers = new Headers(requestOptions.headers)
      headers.set('Authorization', `Bearer ${tokens.accessToken}`)
      requestOptions.headers = headers
    },
  })

  // Параллельные 401 ждут одно общее обновление, иначе одноразовый refresh-токен сгорит на первом
  let refreshing: Promise<boolean> | null = null

  async function refreshTokens(): Promise<boolean> {
    const stored = options.tokens.read()
    if (!stored) return false
    try {
      const { tokens } = await base<{ tokens: AuthTokens }>(REFRESH_PATH, {
        method: 'POST',
        body: { refreshToken: stored.refreshToken },
      })
      options.tokens.write(tokens)
      return true
    } catch {
      options.tokens.clear()
      return false
    }
  }

  function refreshOnce(): Promise<boolean> {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null
    })
    return refreshing
  }

  async function apiFetch<T = unknown>(request: string, fetchOptions?: FetchOptions<'json'>) {
    try {
      return await base<T>(request, fetchOptions)
    } catch (error) {
      if (!isUnauthorized(error) || request.startsWith(AUTH_PATH_PREFIX)) throw error

      if (isTokenMode && (await refreshOnce())) {
        try {
          return await base<T>(request, fetchOptions)
        } catch (retryError) {
          if (!isUnauthorized(retryError)) throw retryError
          await options.onUnauthorized()
          throw retryError
        }
      }
      await options.onUnauthorized()
      throw error
    }
  }

  return Object.assign(apiFetch, { raw: base.raw, create: base.create })
}
