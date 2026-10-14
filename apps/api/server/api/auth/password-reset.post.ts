import { and, eq, gt } from 'drizzle-orm'
import { db, schema } from '../../database'
import { passwordResetRequestSchema } from '@garage/shared/schemas/auth'
import {
  PASSWORD_RESET_MIN_INTERVAL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
  buildResetMessage,
  generateResetToken,
  hashResetToken,
} from '../../utils/passwordReset'

/** Всегда 204: по ответу нельзя узнать, есть ли такой email. */
export default defineEventHandler(async (event) => {
  const mailConfig = getMailConfig()
  if (!isMailEnabled(mailConfig)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const { email } = await readValidatedBody(event, passwordResetRequestSchema.parse)

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) })
  setResponseStatus(event, 204)
  if (!user) return null

  const recent = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(schema.passwordResetTokens.userId, user.id),
      gt(
        schema.passwordResetTokens.createdAt,
        new Date(Date.now() - PASSWORD_RESET_MIN_INTERVAL_MS),
      ),
    ),
  })
  if (recent) return null

  const token = generateResetToken()
  await db.insert(schema.passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  })

  const link = buildAppLink(
    String(useRuntimeConfig().appUrl || ''),
    `/reset-password?token=${encodeURIComponent(token)}`,
  )
  try {
    await sendMail(buildResetMessage(user.email, link), mailConfig)
  } catch (error) {
    console.error('[auth] не удалось отправить письмо сброса пароля', error)
  }
  return null
})
