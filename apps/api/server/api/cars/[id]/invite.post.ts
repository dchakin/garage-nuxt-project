import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { inviteSchema } from '@garage/shared/schemas/car'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, inviteSchema.parse)

  const { car, role } = await requireCarAccess(carId, user.id)
  if (role !== 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Приглашать участников может только владелец',
    })
  }

  const invitedUser = await db.query.users.findFirst({
    where: eq(schema.users.email, body.email),
  })
  if (!invitedUser) {
    throw createError({ statusCode: 404, statusMessage: 'user_not_found' })
  }

  // Владелец в car_members не хранится, но участником машины уже является
  if (invitedUser.id === car.ownerId) {
    throw createError({ statusCode: 409, statusMessage: 'already_member' })
  }

  const existing = await db.query.carMembers.findFirst({
    where: and(eq(schema.carMembers.carId, carId), eq(schema.carMembers.userId, invitedUser.id)),
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'already_member' })
  }

  const [member] = await db
    .insert(schema.carMembers)
    .values({ carId, userId: invitedUser.id, role: 'member' })
    .returning()

  return member
})
