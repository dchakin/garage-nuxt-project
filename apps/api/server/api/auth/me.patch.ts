import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { profileSchema } from '@garage/shared/schemas/auth'
import type { AuthUser } from '@garage/shared/types'

export default defineEventHandler(async (event): Promise<AuthUser> => {
  const { user } = await requireAuth(event)
  const { name } = await readValidatedBody(event, profileSchema.parse)

  const [updated] = await db
    .update(schema.users)
    .set({ name })
    .where(eq(schema.users.id, user.id))
    .returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  const authUser: AuthUser = { id: updated.id, email: updated.email, name: updated.name }
  await refreshCookieSession(event, authUser)
  return authUser
})
