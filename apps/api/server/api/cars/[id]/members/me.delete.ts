import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))

  const { role } = await requireCarAccess(carId, user.id)
  if (role === 'owner') {
    throw createError({ statusCode: 400, statusMessage: 'Владелец не может выйти из машины' })
  }

  await db
    .delete(schema.carMembers)
    .where(and(eq(schema.carMembers.carId, carId), eq(schema.carMembers.userId, user.id)))

  return { ok: true }
})
