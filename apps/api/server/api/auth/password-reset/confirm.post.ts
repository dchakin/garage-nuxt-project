import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { passwordResetConfirmSchema } from '@garage/shared/schemas/auth'
import { hashResetToken } from '../../../utils/passwordReset'

export default defineEventHandler(async (event) => {
  if (!isMailEnabled(getMailConfig())) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const body = await readValidatedBody(event, passwordResetConfirmSchema.parse)

  // Одноразовость: токен гасится атомарным UPDATE, второй запрос ничего не найдёт.
  const [used] = await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.passwordResetTokens.tokenHash, hashResetToken(body.token)),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning()
  if (!used) {
    throw createError({ statusCode: 400, statusMessage: 'Ссылка недействительна или устарела' })
  }

  const [user] = await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(body.password),
      sessionVersion: sql`${schema.users.sessionVersion} + 1`,
    })
    .where(eq(schema.users.id, used.userId))
    .returning()

  // Остальные неиспользованные ссылки тоже больше не нужны
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.passwordResetTokens.userId, user.id),
        isNull(schema.passwordResetTokens.usedAt),
      ),
    )
  await revokeUserRefreshTokens(user.id)

  return await startAuthSession(event, user, body.authMode)
})
