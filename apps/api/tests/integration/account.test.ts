import Database from 'better-sqlite3'
import { afterAll, describe, expect, it } from 'vitest'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const dbFile = createTestDbFile()

const server = await startApiServer({
  DB_FILE_NAME: dbFile,
  NUXT_SESSION_PASSWORD: 'a'.repeat(32),
  NUXT_SESSION_COOKIE_SECURE: 'false',
})
const { fetch } = createHttpClient(server.baseUrl)

afterAll(() => {
  server.stop()
  cleanupTestDbFile(dbFile)
})

const PASSWORD = 'password1'

function send(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return fetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

async function register(email: string, name = 'Тест') {
  const res = await send('/api/auth/register', 'POST', { email, password: PASSWORD, name })
  const cookie = res.headers.get('set-cookie')!.split(';')[0]
  const body = await res.json()
  return { cookie, userId: body.id as number, email }
}

async function loginWithTokens(email: string, password = PASSWORD) {
  const res = await send('/api/auth/login', 'POST', { email, password, authMode: 'token' })
  return res
}

function countRows(sql: string, ...params: unknown[]): number {
  const sqlite = new Database(dbFile, { readonly: true })
  try {
    return (sqlite.prepare(sql).get(...params) as { n: number }).n
  } finally {
    sqlite.close()
  }
}

describe('PATCH /api/auth/me', () => {
  it('меняет имя и возвращает AuthUser', async () => {
    const user = await register('name@test.local', 'Старое')
    const res = await send('/api/auth/me', 'PATCH', { name: '  Новое  ' }, { cookie: user.cookie })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: user.userId, email: user.email, name: 'Новое' })

    // кука стейтлес: новое имя приходит в обновлённой куке ответа
    const freshCookie = res.headers.get('set-cookie')!.split(';')[0]
    const session = await send('/api/auth/session', 'GET', undefined, { cookie: freshCookie })
    expect(await session.json()).toMatchObject({ name: 'Новое' })
  })

  it('пустое имя — 400, без авторизации — 401', async () => {
    const user = await register('name2@test.local')
    expect(
      (await send('/api/auth/me', 'PATCH', { name: '  ' }, { cookie: user.cookie })).status,
    ).toBe(400)
    expect((await send('/api/auth/me', 'PATCH', { name: 'X' })).status).toBe(401)
  })
})

describe('POST /api/auth/password', () => {
  it('неверный текущий пароль — 400, пароль не меняется', async () => {
    const user = await register('pw-bad@test.local')
    const res = await send(
      '/api/auth/password',
      'POST',
      { currentPassword: 'wrong-one', newPassword: 'newpass1' },
      { cookie: user.cookie },
    )
    expect(res.status).toBe(400)
    expect((await loginWithTokens(user.email)).status).toBe(200)
  })

  it('слишком короткий новый пароль — 400', async () => {
    const user = await register('pw-short@test.local')
    const res = await send(
      '/api/auth/password',
      'POST',
      { currentPassword: PASSWORD, newPassword: '123' },
      { cookie: user.cookie },
    )
    expect(res.status).toBe(400)
  })

  it('без авторизации — 401', async () => {
    const res = await send('/api/auth/password', 'POST', {
      currentPassword: PASSWORD,
      newPassword: 'newpass1',
    })
    expect(res.status).toBe(401)
  })

  it('смена: новый пароль работает, старый — 401, refresh-токены кроме текущего отозваны', async () => {
    const user = await register('pw-ok@test.local')
    const current = (await (await loginWithTokens(user.email)).json()).tokens
    const other = (await (await loginWithTokens(user.email)).json()).tokens

    const res = await send(
      '/api/auth/password',
      'POST',
      { currentPassword: PASSWORD, newPassword: 'newpass1', refreshToken: current.refreshToken },
      { authorization: `Bearer ${current.accessToken}` },
    )
    expect(res.status).toBe(200)

    expect((await loginWithTokens(user.email, PASSWORD)).status).toBe(401)
    expect((await loginWithTokens(user.email, 'newpass1')).status).toBe(200)

    const otherRefresh = await send('/api/auth/refresh', 'POST', {
      refreshToken: other.refreshToken,
    })
    expect(otherRefresh.status).toBe(401)
    const currentRefresh = await send('/api/auth/refresh', 'POST', {
      refreshToken: current.refreshToken,
    })
    expect(currentRefresh.status).toBe(200)
  })
})

describe('DELETE /api/auth/account', () => {
  it('без авторизации — 401', async () => {
    expect((await send('/api/auth/account', 'DELETE')).status).toBe(401)
  })

  it('удаляет пользователя, его машины, членства, push-подписки и токены; чистит сессию', async () => {
    const owner = await register('del-owner@test.local', 'Удаляемый')
    const friend = await register('del-friend@test.local', 'Друг')
    const tokens = (await (await loginWithTokens(owner.email)).json()).tokens

    const ownCar = await (
      await send(
        '/api/cars',
        'POST',
        { brand: 'Toyota', model: 'Camry', currentMileage: 1000 },
        {
          cookie: owner.cookie,
        },
      )
    ).json()
    await send(
      `/api/cars/${ownCar.id}/invite`,
      'POST',
      { email: friend.email },
      {
        cookie: owner.cookie,
      },
    )

    const friendCar = await (
      await send(
        '/api/cars',
        'POST',
        { brand: 'Kia', model: 'Rio', currentMileage: 500 },
        {
          cookie: friend.cookie,
        },
      )
    ).json()
    await send(
      `/api/cars/${friendCar.id}/invite`,
      'POST',
      { email: owner.email },
      {
        cookie: friend.cookie,
      },
    )
    const entry = await (
      await send(
        `/api/cars/${friendCar.id}/entries`,
        'POST',
        { type: 'repair', date: '2026-09-01', mileage: 600, cost: 100, description: 'Тест' },
        { cookie: owner.cookie },
      )
    ).json()
    expect(entry.id).toBeTruthy()

    await send(
      '/api/push/subscribe',
      'POST',
      { endpoint: 'https://push.test/abc', keys: { p256dh: 'p', auth: 'a' } },
      { cookie: owner.cookie },
    )

    const res = await send('/api/auth/account', 'DELETE', undefined, { cookie: owner.cookie })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('nuxt-session=')

    expect(countRows('SELECT count(*) n FROM users WHERE id = ?', owner.userId)).toBe(0)
    expect(countRows('SELECT count(*) n FROM cars WHERE id = ?', ownCar.id)).toBe(0)
    expect(countRows('SELECT count(*) n FROM car_members WHERE user_id = ?', owner.userId)).toBe(0)
    expect(
      countRows('SELECT count(*) n FROM push_subscriptions WHERE user_id = ?', owner.userId),
    ).toBe(0)
    expect(countRows('SELECT count(*) n FROM refresh_tokens WHERE user_id = ?', owner.userId)).toBe(
      0,
    )
    expect(countRows('SELECT count(*) n FROM entries WHERE author_id = ?', owner.userId)).toBe(0)

    // чужая машина и сам друг остались
    expect(countRows('SELECT count(*) n FROM cars WHERE id = ?', friendCar.id)).toBe(1)
    expect(countRows('SELECT count(*) n FROM users WHERE id = ?', friend.userId)).toBe(1)

    expect((await loginWithTokens(owner.email)).status).toBe(401)
    expect(
      (await send('/api/cars', 'GET', undefined, { authorization: `Bearer ${tokens.accessToken}` }))
        .status,
    ).toBe(200)
  })
})
