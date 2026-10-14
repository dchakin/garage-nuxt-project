import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { entrySchema } from '@garage/shared/schemas/entry'
import { findEntryWithRelations } from '../../../utils/entryRelations'
import { closeReminderWithEntry } from '../../../utils/closeReminder'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const body = await readValidatedBody(event, entrySchema.parse)

  let reminder: typeof schema.reminders.$inferSelect | undefined
  if (body.reminderId != null) {
    reminder = await db.query.reminders.findFirst({
      where: and(eq(schema.reminders.id, body.reminderId), eq(schema.reminders.carId, carId)),
    })
    if (!reminder) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Напоминание не найдено для этого автомобиля',
      })
    }
  }

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
      place: body.place ?? null,
    })
    .returning({ id: schema.entries.id })

  // Закрываем напоминание до проверки push: иначе уйдёт уведомление по старому сроку
  const closedReminder = reminder
    ? await closeReminderWithEntry(reminder, {
        id: entry.id,
        date: body.date,
        mileage: body.mileage ?? null,
      })
    : null

  // Обновляем текущий пробег авто, если запись новее
  if (body.mileage != null) {
    const car = await db.query.cars.findFirst({ where: eq(schema.cars.id, carId) })
    if (car && body.mileage > car.currentMileage) {
      await db
        .update(schema.cars)
        .set({ currentMileage: body.mileage, mileageUpdatedAt: new Date() })
        .where(eq(schema.cars.id, carId))
      // Пробег вырос — напоминания по км могли стать «скоро»/«просрочено».
      // Не ждём отправку, чтобы не задерживать ответ.
      notifyDueReminders({ carId }).catch((e) => console.error('[push] проверка напоминаний', e))
    }
  }

  const created = await findEntryWithRelations(entry.id)
  return closedReminder ? { ...created, reminder: closedReminder } : created
})
