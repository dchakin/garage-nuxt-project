import { afterAll, describe, expect, it } from 'vitest'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const dbFile = createTestDbFile()

const server = await startApiServer({
  DB_FILE_NAME: dbFile,
  NUXT_SESSION_PASSWORD: 'a'.repeat(32),
  NUXT_SESSION_COOKIE_SECURE: 'false',
  NUXT_CORS_ORIGINS: 'http://allowed.test',
})
const { $fetch, fetch } = createHttpClient(server.baseUrl)

afterAll(() => {
  server.stop()
  cleanupTestDbFile(dbFile)
})

interface TokenAuthResponse {
  id: number
  email: string
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
}

function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('token auth (мобильный клиент)', () => {
  let tokens: TokenAuthResponse['tokens']

  it('регистрация с authMode=token возвращает пару токенов и не ставит куку', async () => {
    const res = await postJson('/api/auth/register', {
      email: 'mobile@test.local',
      password: 'password1',
      name: 'Mobile',
      authMode: 'token',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
    const body = (await res.json()) as TokenAuthResponse
    expect(body).toMatchObject({ email: 'mobile@test.local' })
    expect(body.tokens.accessToken).toBeTruthy()
    expect(body.tokens.refreshToken).toBeTruthy()
    expect(body.tokens.expiresIn).toBeGreaterThan(0)
  })

  it('логин с authMode=token возвращает токены', async () => {
    const res = await postJson('/api/auth/login', {
      email: 'mobile@test.local',
      password: 'password1',
      authMode: 'token',
    })
    expect(res.headers.get('set-cookie')).toBeNull()
    tokens = ((await res.json()) as TokenAuthResponse).tokens
    expect(tokens.accessToken).toBeTruthy()
  })

  it('по умолчанию (веб) логин не отдаёт токены, а ставит куку', async () => {
    const res = await postJson('/api/auth/login', {
      email: 'mobile@test.local',
      password: 'password1',
    })
    expect(res.headers.get('set-cookie')).toContain('nuxt-session=')
    expect(await res.json()).not.toHaveProperty('tokens')
  })

  it('Bearer access-токен открывает защищённые роуты, мусор и refresh-токен — 401', async () => {
    const cars = await $fetch('/api/cars', { headers: bearer(tokens.accessToken) })
    expect(Array.isArray(cars)).toBe(true)

    await expect($fetch('/api/cars', { headers: bearer('garbage') })).rejects.toMatchObject({
      statusCode: 401,
    })
    await expect(
      $fetch('/api/cars', { headers: bearer(tokens.refreshToken) }),
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('session: Bearer → пользователь, битый Bearer → 401, без credentials → null', async () => {
    const user = await $fetch('/api/auth/session', { headers: bearer(tokens.accessToken) })
    expect(user).toMatchObject({ email: 'mobile@test.local' })
    await expect($fetch('/api/auth/session', { headers: bearer('garbage') })).rejects.toMatchObject(
      { statusCode: 401 },
    )
    expect(await $fetch('/api/auth/session')).toBeFalsy()
  })

  it('refresh выдаёт новую пару, а старый refresh-токен одноразовый', async () => {
    const res = await postJson('/api/auth/refresh', { refreshToken: tokens.refreshToken })
    expect(res.status).toBe(200)
    const { tokens: fresh } = (await res.json()) as Pick<TokenAuthResponse, 'tokens'>
    expect(fresh.refreshToken).not.toBe(tokens.refreshToken)

    const reused = await postJson('/api/auth/refresh', { refreshToken: tokens.refreshToken })
    expect(reused.status).toBe(401)

    const cars = await $fetch('/api/cars', { headers: bearer(fresh.accessToken) })
    expect(Array.isArray(cars)).toBe(true)
    tokens = fresh
  })

  it('logout с refresh-токеном отзывает его', async () => {
    expect((await postJson('/api/auth/logout', { refreshToken: tokens.refreshToken })).status).toBe(
      200,
    )
    const refreshed = await postJson('/api/auth/refresh', { refreshToken: tokens.refreshToken })
    expect(refreshed.status).toBe(401)
  })
})

describe('CORS', () => {
  const preflight = (origin: string) =>
    fetch('/api/cars', {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    })

  it.each(['capacitor://localhost', 'https://localhost', 'http://allowed.test'])(
    'preflight с origin %s разрешён',
    async (origin) => {
      const res = await preflight(origin)
      expect(res.status).toBe(204)
      expect(res.headers.get('access-control-allow-origin')).toBe(origin)
      expect(res.headers.get('access-control-allow-headers')).toContain('Authorization')
    },
  )

  it('чужой origin не получает access-control-allow-origin', async () => {
    const res = await preflight('http://evil.test')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('обычный ответ для разрешённого origin содержит CORS-заголовки', async () => {
    const res = await fetch('/api/health', { headers: { origin: 'capacitor://localhost' } })
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
  })
})

describe('служебные роуты', () => {
  it('/api/health отвечает ok, /api/push/config отдаёт публичный VAPID-ключ', async () => {
    expect(await $fetch('/api/health')).toEqual({ ok: true })
    expect(await $fetch('/api/push/config')).toEqual({ vapidPublicKey: '' })
  })

  it('неизвестный /api/** — 404, без SPA-фолбэка', async () => {
    await expect($fetch('/api/nope')).rejects.toMatchObject({ statusCode: 404 })
  })
})
