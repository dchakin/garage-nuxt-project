import { createHmac } from 'node:crypto'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import {
  extractBearerToken,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../../server/utils/tokens'

const SECRET = 'a'.repeat(32)
const user = { id: 7, email: 'u@test.local', name: 'Юзер' }

function baseJwt() {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuer('garage-api')
    .setAudience('garage-access')
}

describe('access-токен', () => {
  it('подписанный токен проверяется и возвращает пользователя', async () => {
    const token = await signAccessToken(user, SECRET)
    expect(await verifyAccessToken(token, SECRET)).toEqual(user)
  })

  it('токен с другим секретом, мусор и подделанная подпись отклоняются', async () => {
    const token = await signAccessToken(user, SECRET)
    expect(await verifyAccessToken(token, 'b'.repeat(32))).toBeNull()
    expect(await verifyAccessToken('garbage', SECRET)).toBeNull()
    // меняем первый символ подписи: у последнего символа часть битов не значима, подмена бывает «нулевой»
    const [header, payload, signature] = token.split('.')
    const tamperedFirst = signature[0] === 'A' ? 'B' : 'A'
    const tampered = `${header}.${payload}.${tamperedFirst}${signature.slice(1)}`
    expect(await verifyAccessToken(tampered, SECRET)).toBeNull()
  })

  it('просроченный токен отклоняется', async () => {
    const key = createHmac('sha256', SECRET).update('garage:access-token').digest()
    const now = Math.floor(Date.now() / 1000)
    const expired = await baseJwt()
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 60)
      .sign(key)
    expect(await verifyAccessToken(expired, SECRET)).toBeNull()
  })

  it('токен, подписанный «сырым» паролем сессии, не принимается (ключ выводится отдельно)', async () => {
    const forged = await baseJwt().setExpirationTime('5m').sign(new TextEncoder().encode(SECRET))
    expect(await verifyAccessToken(forged, SECRET)).toBeNull()
  })
})

describe('refresh-токен', () => {
  it('генерируется уникальным, хэш детерминирован и не равен токену', () => {
    const first = generateRefreshToken()
    const second = generateRefreshToken()
    expect(first).not.toBe(second)
    expect(hashRefreshToken(first)).toBe(hashRefreshToken(first))
    expect(hashRefreshToken(first)).not.toBe(first)
    expect(hashRefreshToken(first)).toHaveLength(64)
  })
})

describe('extractBearerToken', () => {
  it('достаёт токен из заголовка и игнорирует прочие схемы', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
    expect(extractBearerToken('bearer abc')).toBe('abc')
    expect(extractBearerToken('Basic abc')).toBeNull()
    expect(extractBearerToken('Bearer')).toBeNull()
    expect(extractBearerToken(undefined)).toBeNull()
  })
})
