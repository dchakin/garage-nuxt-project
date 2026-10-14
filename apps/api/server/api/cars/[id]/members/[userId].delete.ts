import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  const memberUserId = Number(getRouterParam(event, 'userId'))

  const { car, role } = await requireCarAccess(carId, user.id)
  if (role !== 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Удалять участников может только владелец',
    })
  }
  if (memberUserId === car.ownerId) {
    throw createError({ statusCode: 400, statusMessage: 'Нельзя удалить владельца' })
  }

  const [removed] = await db
    .delete(schema.carMembers)
    .where(and(eq(schema.carMembers.carId, carId), eq(schema.carMembers.userId, memberUserId)))
    .returning()
  if (!removed) {
    throw createError({ statusCode: 404, statusMessage: 'Участник не найден' })
  }

  return { ok: true }
})
