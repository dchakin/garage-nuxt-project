import { refreshSchema } from '@garage/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  await clearCookieSession(event)

  // Мобильный клиент присылает refresh-токен в теле, чтобы отозвать его на сервере
  const body = await readBody(event).catch(() => null)
  const parsed = refreshSchema.safeParse(body)
  if (parsed.success) await revokeRefreshToken(parsed.data.refreshToken)

  return { ok: true }
})
