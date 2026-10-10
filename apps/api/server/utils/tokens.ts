import { createHash, createHmac, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser } from '@garage/shared/types'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

const ACCESS_TOKEN_ISSUER = 'garage-api'
const ACCESS_TOKEN_AUDIENCE = 'garage-access'
const REFRESH_TOKEN_BYTES = 32

/** Ключ подписи access-токенов выводится из пароля сессии, но не совпадает с ним. */
function deriveAccessKey(sessionPassword: string): Uint8Array {
  return createHmac('sha256', sessionPassword).update('garage:access-token').digest()
}

export async function signAccessToken(user: AuthUser, sessionPassword: string): Promise<string> {
  return await new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(deriveAccessKey(sessionPassword))
}

/** Возвращает пользователя из валидного access-токена или null (подпись, срок, issuer). */
export async function verifyAccessToken(
  token: string,
  sessionPassword: string,
): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, deriveAccessKey(sessionPassword), {
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      algorithms: ['HS256'],
    })
    const id = Number(payload.sub)
    if (!Number.isInteger(id) || typeof payload.email !== 'string') return null
    return { id, email: payload.email, name: String(payload.name ?? '') }
  } catch {
    return null
  }
}

/** Refresh-токен — случайная строка; в БД хранится только её SHA-256. */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader ?? '')
  return match ? match[1] : null
}
