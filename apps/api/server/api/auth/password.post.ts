import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { changePasswordSchema } from '@garage/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const body = await readValidatedBody(event, changePasswordSchema.parse)

  const stored = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) })
  if (!stored) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  if (!(await verifyPassword(stored.passwordHash, body.currentPassword))) {
    throw createError({ statusCode: 400, statusMessage: 'Неверный текущий пароль' })
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(body.newPassword) })
    .where(eq(schema.users.id, user.id))
  await revokeUserRefreshTokens(user.id, body.refreshToken)

  return { ok: true }
})
