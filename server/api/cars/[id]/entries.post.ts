import { eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { entrySchema } from '~~/shared/schemas/entry'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const body = await readValidatedBody(event, entrySchema.parse)

  const [entry] = await db
    .insert(schema.entries)
    .values({
      carId,
      authorId: user.id,
      date: body.date,
      type: body.type,
      categoryId: body.categoryId ?? null,
      description: body.description,
      mileage: body.mileage ?? null,
      cost: body.cost ?? null,
      currency: body.currency,
      place: body.place ?? null
    })
    .returning()

  // Обновляем текущий пробег авто, если запись новее
  if (body.mileage != null) {
    const car = await db.query.cars.findFirst({ where: eq(schema.cars.id, carId) })
    if (car && body.mileage > car.currentMileage) {
      await db.update(schema.cars).set({ currentMileage: body.mileage }).where(eq(schema.cars.id, carId))
      // Пробег вырос — напоминания по км могли стать «скоро»/«просрочено».
      // Не ждём отправку, чтобы не задерживать ответ.
      notifyDueReminders({ carId }).catch((e) => console.error('[push] проверка напоминаний', e))
    }
  }

  return entry
})
