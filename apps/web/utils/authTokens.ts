import type { AuthTokens } from '@garage/shared/types'

/** Хранилище токенов мобильного клиента. В вебе (cookie-режим) не используется. */
export interface TokenStore {
  read(): AuthTokens | null
  write(tokens: AuthTokens): void
  clear(): void
}

const STORAGE_KEY = 'garage-auth-tokens'

function isAuthTokens(value: unknown): value is AuthTokens {
  const tokens = value as Partial<AuthTokens> | null
  return typeof tokens?.accessToken === 'string' && typeof tokens?.refreshToken === 'string'
}

/**
 * Токены в localStorage. На этапе Capacitor (docs/plans/mobile-stores.md) хранилище можно
 * заменить на нативное (Keychain/Keystore) — потребители зависят только от интерфейса TokenStore.
 * localStorage может быть недоступен (приватный режим) — тогда сессия живёт до перезагрузки.
 */
export const localTokenStore: TokenStore = {
  read() {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      return isAuthTokens(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  write(tokens) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    } catch {
      // хранилище недоступно — токены останутся только в памяти текущей вкладки
    }
  },
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ничего не храним — чистить нечего
    }
  },
}
