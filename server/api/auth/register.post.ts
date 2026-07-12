import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { registerSchema } from '~~/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, body.email)
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Пользователь с таким email уже существует' })
  }

  const passwordHash = await hashPassword(body.password)

  const [user] = await db
    .insert(schema.users)
    .values({ email: body.email, passwordHash, name: body.name })
    .returning()

  await setUserSession(event, {
    user: { id: user.id, email: user.email, name: user.name }
  })

  return { id: user.id, email: user.email, name: user.name }
})
