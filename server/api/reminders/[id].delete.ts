import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const reminderId = Number(getRouterParam(event, 'id'))

  const reminder = await db.query.reminders.findFirst({ where: eq(schema.reminders.id, reminderId) })
  if (!reminder) {
    throw createError({ statusCode: 404, statusMessage: 'Напоминание не найдено' })
  }
  await requireCarAccess(reminder.carId, user.id)

  await db.delete(schema.reminders).where(eq(schema.reminders.id, reminderId))

  return { ok: true }
})
