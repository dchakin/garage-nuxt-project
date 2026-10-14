import { eq } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { analyticsQuerySchema } from '@garage/shared/schemas/analytics'
import { todayIso } from '@garage/shared/utils/format'
import { computeCarAnalytics } from '../../../utils/analytics'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const query = await getValidatedQuery(event, analyticsQuerySchema.parse)

  const rows = await db
    .select({
      date: schema.entries.date,
      cost: schema.entries.cost,
      mileage: schema.entries.mileage,
      categoryId: schema.entries.categoryId,
      categoryName: schema.categories.name,
    })
    .from(schema.entries)
    .leftJoin(schema.categories, eq(schema.entries.categoryId, schema.categories.id))
    .where(eq(schema.entries.carId, carId))

  return computeCarAnalytics(rows, { period: query.period, date: query.date, today: todayIso() })
})
