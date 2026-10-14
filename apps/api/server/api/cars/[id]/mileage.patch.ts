import { eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { carMileageSchema } from '@garage/shared/schemas/car'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, carMileageSchema.parse)

  const { car } = await requireCarAccess(carId, user.id)
  if (body.mileage < car.currentMileage && body.confirmDecrease !== true) {
    throw createError({ statusCode: 400, statusMessage: 'mileage_decrease_unconfirmed' })
  }

  const [updated] = await db
    .update(schema.cars)
    .set({ currentMileage: body.mileage, mileageUpdatedAt: new Date() })
    .where(eq(schema.cars.id, carId))
    .returning()

  // Не ждём отправку, чтобы не задерживать ответ
  notifyDueReminders({ carId }).catch((e) => console.error('[push] проверка напоминаний', e))

  return updated
})
