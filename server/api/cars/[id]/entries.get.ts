import { and, eq, gte, lte, asc, desc } from 'drizzle-orm'
import { db, schema } from '../../../database'
import { entryFilterSchema } from '~~/shared/schemas/entry'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  const query = await getValidatedQuery(event, entryFilterSchema.parse)

  const conditions = [eq(schema.entries.carId, carId)]
  if (query.type) conditions.push(eq(schema.entries.type, query.type))
  if (query.categoryId) conditions.push(eq(schema.entries.categoryId, query.categoryId))
  if (query.dateFrom) conditions.push(gte(schema.entries.date, query.dateFrom))
  if (query.dateTo) conditions.push(lte(schema.entries.date, query.dateTo))

  const sortColumn = query.sortBy === 'mileage' ? schema.entries.mileage : schema.entries.date
  const orderFn = query.sortDir === 'asc' ? asc : desc

  const list = await db.query.entries.findMany({
    where: and(...conditions),
    orderBy: orderFn(sortColumn),
    with: { category: true }
  })

  return list
})
