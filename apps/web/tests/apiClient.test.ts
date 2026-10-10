import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../utils/apiClient'
import type { TokenStore } from '../utils/authTokens'
import type { AuthTokens } from '@garage/shared/types'

const fetchMock = vi.fn()

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function memoryTokenStore(initial: AuthTokens | null): TokenStore & { current: AuthTokens | null } {
  const store = {
    current: initial,
    read: () => store.current,
    write: (tokens: AuthTokens) => {
      store.current = tokens
    },
    clear: () => {
      store.current = null
    },
  }
  return store
}

const oldTokens: AuthTokens = {
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  expiresIn: 900,
}
const newTokens: AuthTokens = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  expiresIn: 900,
}

/** Заголовок Authorization последнего вызова fetch для данного пути. */
function authorizationOf(call: unknown[]): string | null {
  const init = call[1] as { headers?: Headers } | undefined
  return new Headers(init?.headers).get('authorization')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createApiClient', () => {
  it('добавляет baseURL к путям', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }))
    const api = createApiClient({
      baseURL: 'https://garage.example',
      authMode: 'cookie',
      tokens: memoryTokenStore(null),
      onUnauthorized: vi.fn(),
    })

    await api('/api/cars')

    expect(String(fetchMock.mock.calls[0][0])).toBe('https://garage.example/api/cars')
  })

  it('в token-режиме шлёт Bearer, в cookie-режиме — нет', async () => {
    fetchMock.mockImplementation(async () => json([]))
    const tokenApi = createApiClient({
      baseURL: '',
      authMode: 'token',
      tokens: memoryTokenStore(oldTokens),
      onUnauthorized: vi.fn(),
    })
    const cookieApi = createApiClient({
      baseURL: '',
      authMode: 'cookie',
      tokens: memoryTokenStore(oldTokens),
      onUnauthorized: vi.fn(),
    })

    await tokenApi('/api/cars')
    await cookieApi('/api/cars')

    expect(authorizationOf(fetchMock.mock.calls[0])).toBe('Bearer old-access')
    expect(authorizationOf(fetchMock.mock.calls[1])).toBeNull()
  })

  it('на 401 обновляет токены и повторяет запрос с новым access-токеном', async () => {
    const tokens = memoryTokenStore(oldTokens)
    const onUnauthorized = vi.fn()
    fetchMock.mockImplementation(async (url: string, init: { headers?: Headers }) => {
      if (String(url).endsWith('/api/auth/refresh')) return json({ tokens: newTokens })
      return authorizationOf([url, init]) === 'Bearer new-access'
        ? json([{ id: 1 }])
        : json({}, 401)
    })
    const api = createApiClient({ baseURL: '', authMode: 'token', tokens, onUnauthorized })

    const result = await api('/api/cars')

    expect(result).toEqual([{ id: 1 }])
    expect(tokens.current).toEqual(newTokens)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('параллельные 401 делят одно обновление токена', async () => {
    const tokens = memoryTokenStore(oldTokens)
    fetchMock.mockImplementation(async (url: string, init: { headers?: Headers }) => {
      if (String(url).endsWith('/api/auth/refresh')) return json({ tokens: newTokens })
      return authorizationOf([url, init]) === 'Bearer new-access' ? json([]) : json({}, 401)
    })
    const api = createApiClient({
      baseURL: '',
      authMode: 'token',
      tokens,
      onUnauthorized: vi.fn(),
    })

    await Promise.all([api('/api/cars'), api('/api/categories'), api('/api/cars/1')])

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('если обновить токен не удалось — чистит токены и сообщает о конце сессии', async () => {
    const tokens = memoryTokenStore(oldTokens)
    const onUnauthorized = vi.fn()
    fetchMock.mockImplementation(async () => json({}, 401))
    const api = createApiClient({ baseURL: '', authMode: 'token', tokens, onUnauthorized })

    await expect(api('/api/cars')).rejects.toMatchObject({ statusCode: 401 })

    expect(tokens.current).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('в cookie-режиме 401 сразу сообщает о конце сессии, без refresh', async () => {
    const onUnauthorized = vi.fn()
    fetchMock.mockResolvedValue(json({}, 401))
    const api = createApiClient({
      baseURL: '',
      authMode: 'cookie',
      tokens: memoryTokenStore(null),
      onUnauthorized,
    })

    await expect(api('/api/cars')).rejects.toMatchObject({ statusCode: 401 })

    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('401 на /api/auth/* (неверный пароль) — обычная ошибка: без refresh и без выхода', async () => {
    const onUnauthorized = vi.fn()
    fetchMock.mockResolvedValue(json({ statusMessage: 'Неверный email или пароль' }, 401))
    const api = createApiClient({
      baseURL: '',
      authMode: 'token',
      tokens: memoryTokenStore(oldTokens),
      onUnauthorized,
    })

    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      statusCode: 401,
    })

    expect(onUnauthorized).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('не-401 ошибки пробрасываются как есть', async () => {
    const onUnauthorized = vi.fn()
    fetchMock.mockResolvedValue(json({}, 403))
    const api = createApiClient({
      baseURL: '',
      authMode: 'token',
      tokens: memoryTokenStore(oldTokens),
      onUnauthorized,
    })

    await expect(api('/api/cars/1')).rejects.toMatchObject({ statusCode: 403 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
