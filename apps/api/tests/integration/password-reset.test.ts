import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterAll, describe, expect, it } from 'vitest'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { cleanupTestDbFile, createTestDbFile } from '../helpers/testDb'

const outboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-reset-outbox-'))
const dbFile = createTestDbFile()
const dbWithoutMail = createTestDbFile()
const baseEnv = { NUXT_SESSION_PASSWORD: 'a'.repeat(32), NUXT_SESSION_COOKIE_SECURE: 'false' }

const server = await startApiServer({
  ...baseEnv,
  DB_FILE_NAME: dbFile,
  NUXT_MAIL_OUTBOX_DIR: outboxDir,
  NUXT_APP_URL: 'https://garage.test',
})
const noMailServer = await startApiServer({ ...baseEnv, DB_FILE_NAME: dbWithoutMail })
const { fetch } = createHttpClient(server.baseUrl)

afterAll(() => {
  server.stop()
  noMailServer.stop()
  cleanupTestDbFile(dbFile)
  cleanupTestDbFile(dbWithoutMail)
  fs.rmSync(outboxDir, { recursive: true, force: true })
})

const PASSWORD = 'password1'
const NEW_PASSWORD = 'newpassword2'

function send(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return fetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

async function register(email: string) {
  const res = await send('/api/auth/register', 'POST', { email, password: PASSWORD, name: 'Тест' })
  return { cookie: res.headers.get('set-cookie')!.split(';')[0] }
}

function readOutbox(): { to: string; text: string }[] {
  return fs
    .readdirSync(outboxDir)
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(outboxDir, file), 'utf8')))
}

function mailsTo(email: string) {
  return readOutbox().filter((mail) => mail.to === email)
}

function tokenFromMail(email: string): string {
  const mails = mailsTo(email)
  const match = /\/reset-password\?token=([^\s]+)/.exec(mails[mails.length - 1].text)
  return decodeURIComponent(match![1])
}

function updateDb(sql: string, ...params: unknown[]) {
  const db = new Database(dbFile)
  db.prepare(sql).run(...params)
  db.close()
}

function requestReset(email: string) {
  return send('/api/auth/password-reset', 'POST', { email })
}

describe('POST /api/auth/password-reset', () => {
  it('отвечает одинаково для существующего и несуществующего email', async () => {
    await register('exists@example.com')
    const known = await requestReset('exists@example.com')
    const unknown = await requestReset('nobody@example.com')

    expect(known.status).toBe(204)
    expect(unknown.status).toBe(204)
    expect(await known.text()).toBe(await unknown.text())
    expect(mailsTo('exists@example.com')).toHaveLength(1)
    expect(mailsTo('nobody@example.com')).toHaveLength(0)
  })

  it('шлёт ссылку на NUXT_APP_URL/reset-password?token=…', async () => {
    const [mail] = mailsTo('exists@example.com')
    expect(mail.text).toContain('https://garage.test/reset-password?token=')
  })

  it('не чаще раза в 60 секунд на email', async () => {
    await register('rate@example.com')
    expect((await requestReset('rate@example.com')).status).toBe(204)
    expect((await requestReset('rate@example.com')).status).toBe(204)
    expect(mailsTo('rate@example.com')).toHaveLength(1)

    updateDb(`UPDATE password_reset_tokens SET created_at = created_at - 120`)
    await requestReset('rate@example.com')
    expect(mailsTo('rate@example.com')).toHaveLength(2)
  })

  it('невалидный email → 400', async () => {
    expect((await requestReset('not-an-email')).status).toBe(400)
  })

  it('хранит только SHA-256 токена', async () => {
    const token = tokenFromMail('exists@example.com')
    const db = new Database(dbFile, { readonly: true })
    const rows = db.prepare('SELECT token_hash FROM password_reset_tokens').all() as {
      token_hash: string
    }[]
    db.close()
    expect(rows.map((row) => row.token_hash)).not.toContain(token)
    expect(rows.every((row) => /^[0-9a-f]{64}$/.test(row.token_hash))).toBe(true)
  })
})

describe('POST /api/auth/password-reset/confirm', () => {
  it('меняет пароль, входит сразу и гасит старые пароль и cookie', async () => {
    const { cookie: oldCookie } = await register('confirm@example.com')
    expect((await send('/api/auth/session', 'GET', undefined, { cookie: oldCookie })).status).toBe(
      200,
    )
    await requestReset('confirm@example.com')
    const token = tokenFromMail('confirm@example.com')

    const res = await send('/api/auth/password-reset/confirm', 'POST', {
      token,
      password: NEW_PASSWORD,
    })
    expect(res.status).toBe(200)
    expect((await res.json()).email).toBe('confirm@example.com')
    const newCookie = res.headers.get('set-cookie')!.split(';')[0]

    const oldSession = await send('/api/auth/session', 'GET', undefined, { cookie: oldCookie })
    expect(['', 'null']).toContain(await oldSession.text())
    const protectedOld = await send('/api/auth/me', 'PATCH', { name: 'X' }, { cookie: oldCookie })
    expect(protectedOld.status).toBe(401)

    const newSession = await send('/api/auth/session', 'GET', undefined, { cookie: newCookie })
    expect((await newSession.json()).email).toBe('confirm@example.com')

    const oldLogin = await send('/api/auth/login', 'POST', {
      email: 'confirm@example.com',
      password: PASSWORD,
    })
    expect(oldLogin.status).toBe(401)
    const newLogin = await send('/api/auth/login', 'POST', {
      email: 'confirm@example.com',
      password: NEW_PASSWORD,
    })
    expect(newLogin.status).toBe(200)
  })

  it('authMode token отдаёт токены и отзывает прежние refresh-токены', async () => {
    await register('tokens@example.com')
    const login = await send('/api/auth/login', 'POST', {
      email: 'tokens@example.com',
      password: PASSWORD,
      authMode: 'token',
    })
    const oldRefresh = (await login.json()).tokens.refreshToken as string

    await requestReset('tokens@example.com')
    const res = await send('/api/auth/password-reset/confirm', 'POST', {
      token: tokenFromMail('tokens@example.com'),
      password: NEW_PASSWORD,
      authMode: 'token',
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(body.tokens.accessToken).toBeTruthy()

    const refreshOld = await send('/api/auth/refresh', 'POST', { refreshToken: oldRefresh })
    expect(refreshOld.status).toBe(401)
    const refreshNew = await send('/api/auth/refresh', 'POST', {
      refreshToken: body.tokens.refreshToken,
    })
    expect(refreshNew.status).toBe(200)
  })

  it('токен одноразовый', async () => {
    await register('once@example.com')
    await requestReset('once@example.com')
    const token = tokenFromMail('once@example.com')

    const first = await send('/api/auth/password-reset/confirm', 'POST', {
      token,
      password: NEW_PASSWORD,
    })
    const second = await send('/api/auth/password-reset/confirm', 'POST', {
      token,
      password: 'another-pass3',
    })
    expect(first.status).toBe(200)
    expect(second.status).toBe(400)
  })

  it('просроченный токен → 400, пароль не меняется', async () => {
    await register('expired@example.com')
    await requestReset('expired@example.com')
    const token = tokenFromMail('expired@example.com')
    updateDb(
      `UPDATE password_reset_tokens SET expires_at = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
      Math.floor(Date.now() / 1000) - 10,
      'expired@example.com',
    )

    const res = await send('/api/auth/password-reset/confirm', 'POST', {
      token,
      password: NEW_PASSWORD,
    })
    expect(res.status).toBe(400)
    const login = await send('/api/auth/login', 'POST', {
      email: 'expired@example.com',
      password: PASSWORD,
    })
    expect(login.status).toBe(200)
  })

  it('неизвестный токен и короткий пароль → 400', async () => {
    const unknown = await send('/api/auth/password-reset/confirm', 'POST', {
      token: 'nope',
      password: NEW_PASSWORD,
    })
    expect(unknown.status).toBe(400)
    const short = await send('/api/auth/password-reset/confirm', 'POST', {
      token: 'nope',
      password: '123',
    })
    expect(short.status).toBe(400)
  })
})

describe('почта выключена', () => {
  it('оба роута отвечают 404', async () => {
    const client = createHttpClient(noMailServer.baseUrl)
    const headers = { 'content-type': 'application/json' }
    const request = await client.fetch('/api/auth/password-reset', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'a@example.com' }),
    })
    const confirm = await client.fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: 'x', password: NEW_PASSWORD }),
    })
    expect(request.status).toBe(404)
    expect(confirm.status).toBe(404)
  })
})
