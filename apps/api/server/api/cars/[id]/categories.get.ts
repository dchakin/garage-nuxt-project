import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { db, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)

  return db
    .select({
      id: schema.categories.id,
      carId: schema.categories.carId,
      name: schema.categories.name,
      isDefault: schema.categories.isDefault,
      entriesCount: sql<number>`count(${schema.entries.id})`.mapWith(Number),
    })
    .from(schema.categories)
    .leftJoin(
      schema.entries,
      and(eq(schema.entries.categoryId, schema.categories.id), eq(schema.entries.carId, carId)),
    )
    .where(or(isNull(schema.categories.carId), eq(schema.categories.carId, carId)))
    .groupBy(schema.categories.id)
    .orderBy(schema.categories.name)
})
