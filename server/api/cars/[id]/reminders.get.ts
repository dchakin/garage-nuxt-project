import { and, eq, desc } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { reminderFilterSchema } from '~~/shared/schemas/reminder'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const query = await getValidatedQuery(event, reminderFilterSchema.parse)

  const conditions = [eq(schema.reminders.carId, carId)]
  if (query.isActive !== undefined) conditions.push(eq(schema.reminders.isActive, query.isActive))

  const list = await db.query.reminders.findMany({
    where: and(...conditions),
    orderBy: desc(schema.reminders.createdAt),
    with: { category: true, lastEntry: true }
  })

  return list
})
