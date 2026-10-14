import { and, eq, gt, ne } from 'drizzle-orm'
import { createError, getRequestHeader, useSession } from 'h3'
import type { H3Event, SessionConfig } from 'h3'
import type { AuthMode } from '@garage/shared/schemas/auth'
import type { AuthResponse, AuthTokens, AuthUser } from '@garage/shared/types'
import { db, schema } from '../database'
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  extractBearerToken,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens'

interface SessionData {
  user?: AuthUser
  /** `users.sessionVersion` на момент входа; у старых кук нет — это 0. */
  sessionVersion?: number
}

function sessionConfig(): SessionConfig {
  const { session } = useRuntimeConfig()
  if (!session.password) {
    console.error('[auth] NUXT_SESSION_PASSWORD не задан — авторизация не будет работать')
  }
  return {
    name: session.name,
    password: session.password,
    maxAge: session.maxAge,
    cookie: {
      sameSite: session.cookie.sameSite as 'lax' | 'strict' | 'none',
      secure: session.cookie.secure,
    },
  }
}

function toAuthUser(user: AuthUser): AuthUser {
  return { id: user.id, email: user.email, name: user.name }
}

function unauthorized(message = 'Unauthorized') {
  return createError({ statusCode: 401, statusMessage: message })
}

/** Пользователь из `Authorization: Bearer` или из cookie-сессии; null, если не авторизован. */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const bearer = extractBearerToken(getRequestHeader(event, 'authorization'))
  if (bearer) return await verifyAccessToken(bearer, sessionConfig().password as string)

  const session = await useSession<SessionData>(event, sessionConfig())
  const sessionUser = session.data.user
  if (!sessionUser) return null

  // Сброс пароля увеличивает sessionVersion — старые куки перестают действовать.
  const stored = await db.query.users.findFirst({
    columns: { sessionVersion: true },
    where: eq(schema.users.id, sessionUser.id),
  })
  if (!stored || stored.sessionVersion !== (session.data.sessionVersion ?? 0)) return null
  return sessionUser
}

/** Общий вход для защищённых роутов: понимает и cookie-сессию (веб), и Bearer-токен (мобильный). */
export async function requireAuth(event: H3Event): Promise<{ user: AuthUser }> {
  const user = await getAuthUser(event)
  if (!user) throw unauthorized()
  return { user }
}

export async function issueTokens(user: AuthUser): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken()
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  })
  return {
    accessToken: await signAccessToken(toAuthUser(user), sessionConfig().password as string),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  }
}

/**
 * Меняет refresh-токен на новую пару. Старый токен одноразовый: удаляется при обмене,
 * поэтому уже использованный токен перестаёт работать.
 */
export async function rotateRefreshToken(refreshToken: string): Promise<AuthTokens> {
  const [stored] = await db
    .delete(schema.refreshTokens)
    .where(
      and(
        eq(schema.refreshTokens.tokenHash, hashRefreshToken(refreshToken)),
        gt(schema.refreshTokens.expiresAt, new Date()),
      ),
    )
    .returning()
  if (!stored) throw unauthorized('Недействительный refresh-токен')

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, stored.userId) })
  if (!user) throw unauthorized('Недействительный refresh-токен')
  return await issueTokens(user)
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await db
    .delete(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, hashRefreshToken(refreshToken)))
}

/** Открывает сессию после login/register: кука для веба или пара токенов для мобильного клиента. */
export async function startAuthSession(
  event: H3Event,
  user: AuthUser,
  mode: AuthMode,
): Promise<AuthResponse> {
  const authUser = toAuthUser(user)
  if (mode === 'token') {
    return { ...authUser, tokens: await issueTokens(authUser) }
  }
  const stored = await db.query.users.findFirst({
    columns: { sessionVersion: true },
    where: eq(schema.users.id, user.id),
  })
  const session = await useSession<SessionData>(event, sessionConfig())
  await session.update({ user: authUser, sessionVersion: stored?.sessionVersion ?? 0 })
  return authUser
}

/** Обновляет данные пользователя в куке, если запрос пришёл с cookie-сессией (не с Bearer). */
export async function refreshCookieSession(event: H3Event, user: AuthUser): Promise<void> {
  if (extractBearerToken(getRequestHeader(event, 'authorization'))) return
  const session = await useSession<SessionData>(event, sessionConfig())
  if (session.data.user) await session.update({ user: toAuthUser(user) })
}

/** Отзывает все refresh-токены пользователя, кроме `exceptToken` (токен текущего устройства). */
export async function revokeUserRefreshTokens(userId: number, exceptToken?: string): Promise<void> {
  const ofUser = eq(schema.refreshTokens.userId, userId)
  await db
    .delete(schema.refreshTokens)
    .where(
      exceptToken
        ? and(ofUser, ne(schema.refreshTokens.tokenHash, hashRefreshToken(exceptToken)))
        : ofUser,
    )
}

export async function clearCookieSession(event: H3Event): Promise<void> {
  const session = await useSession<SessionData>(event, sessionConfig())
  await session.clear()
}
