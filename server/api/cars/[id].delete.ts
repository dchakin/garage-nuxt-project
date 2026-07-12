import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))

  const { role } = await requireCarAccess(carId, user.id)
  if (role !== 'owner') {
    throw createError({ statusCode: 403, statusMessage: 'Удалить автомобиль может только владелец' })
  }

  await db.delete(schema.cars).where(eq(schema.cars.id, carId))

  return { ok: true }
})
