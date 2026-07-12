import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { inviteSchema } from '~~/shared/schemas/car'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, inviteSchema.parse)

  const { role } = await requireCarAccess(carId, user.id)
  if (role !== 'owner') {
    throw createError({ statusCode: 403, statusMessage: 'Приглашать участников может только владелец' })
  }

  const invitedUser = await db.query.users.findFirst({
    where: eq(schema.users.email, body.email)
  })
  if (!invitedUser) {
    throw createError({ statusCode: 404, statusMessage: 'Пользователь с таким email не зарегистрирован' })
  }

  const existing = await db.query.carMembers.findFirst({
    where: and(eq(schema.carMembers.carId, carId), eq(schema.carMembers.userId, invitedUser.id))
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Пользователь уже приглашён' })
  }

  const [member] = await db
    .insert(schema.carMembers)
    .values({ carId, userId: invitedUser.id, role: 'member' })
    .returning()

  return member
})
