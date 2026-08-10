import { eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { reminderSchema } from '~~/shared/schemas/reminder'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const body = await readValidatedBody(event, reminderSchema.parse)

  let lastEntry: { date: string; mileage: number | null } | null = null
  if (body.lastEntryId) {
    const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, body.lastEntryId) })
    if (!entry || entry.carId !== carId) {
      throw createError({ statusCode: 400, statusMessage: 'Запись не найдена для этого автомобиля' })
    }
    lastEntry = { date: entry.date, mileage: entry.mileage }
  }

  const { nextDueDate, nextDueMileage } = computeNextDue({
    triggerType: body.triggerType,
    intervalMonths: body.intervalMonths,
    intervalKm: body.intervalKm,
    lastEntry,
    nextDueDateOverride: body.nextDueDate,
    nextDueMileageOverride: body.nextDueMileage
  })

  const [reminder] = await db
    .insert(schema.reminders)
    .values({
      carId,
      title: body.title,
      categoryId: body.categoryId ?? null,
      triggerType: body.triggerType,
      intervalMonths: body.intervalMonths ?? null,
      intervalKm: body.intervalKm ?? null,
      lastEntryId: body.lastEntryId ?? null,
      nextDueDate,
      nextDueMileage,
      isActive: body.isActive
    })
    .returning()

  return reminder
})
