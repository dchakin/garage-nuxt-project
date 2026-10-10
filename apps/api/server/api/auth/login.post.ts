import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { loginSchema } from '@garage/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, body.email),
  })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный email или пароль' })
  }

  const isValid = await verifyPassword(user.passwordHash, body.password)
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный email или пароль' })
  }

  return await startAuthSession(event, user, body.authMode)
})
