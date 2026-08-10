import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { reminderBaseSchema } from '~~/shared/schemas/reminder'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const reminderId = Number(getRouterParam(event, 'id'))

  const reminder = await db.query.reminders.findFirst({ where: eq(schema.reminders.id, reminderId) })
  if (!reminder) {
    throw createError({ statusCode: 404, statusMessage: 'Напоминание не найдено' })
  }
  await requireCarAccess(reminder.carId, user.id)

  const body = await readValidatedBody(event, reminderBaseSchema.partial().parse)

  const merged = {
    title: body.title ?? reminder.title,
    categoryId: body.categoryId !== undefined ? body.categoryId : reminder.categoryId,
    triggerType: body.triggerType ?? reminder.triggerType,
    intervalMonths: body.intervalMonths !== undefined ? body.intervalMonths : reminder.intervalMonths,
    intervalKm: body.intervalKm !== undefined ? body.intervalKm : reminder.intervalKm,
    lastEntryId: body.lastEntryId !== undefined ? body.lastEntryId : reminder.lastEntryId,
    nextDueDate: body.nextDueDate !== undefined ? body.nextDueDate : reminder.nextDueDate,
    nextDueMileage: body.nextDueMileage !== undefined ? body.nextDueMileage : reminder.nextDueMileage,
    isActive: body.isActive !== undefined ? body.isActive : reminder.isActive
  }

  let lastEntry: { date: string; mileage: number | null } | null = null
  if (merged.lastEntryId) {
    const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, merged.lastEntryId) })
    if (!entry || entry.carId !== reminder.carId) {
      throw createError({ statusCode: 400, statusMessage: 'Запись не найдена для этого автомобиля' })
    }
    lastEntry = { date: entry.date, mileage: entry.mileage }
  }

  const { nextDueDate, nextDueMileage } = computeNextDue({
    triggerType: merged.triggerType,
    intervalMonths: merged.intervalMonths,
    intervalKm: merged.intervalKm,
    lastEntry,
    nextDueDateOverride: merged.nextDueDate,
    nextDueMileageOverride: merged.nextDueMileage
  })

  const [updated] = await db
    .update(schema.reminders)
    .set({
      title: merged.title,
      categoryId: merged.categoryId,
      triggerType: merged.triggerType,
      intervalMonths: merged.intervalMonths,
      intervalKm: merged.intervalKm,
      lastEntryId: merged.lastEntryId,
      nextDueDate,
      nextDueMileage,
      isActive: merged.isActive
    })
    .where(eq(schema.reminders.id, reminderId))
    .returning()

  return updated ?? reminder
})
