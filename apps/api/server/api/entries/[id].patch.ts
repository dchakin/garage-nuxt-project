import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { entrySchema } from '@garage/shared/schemas/entry'
import { findEntryWithRelations } from '../../utils/entryRelations'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const entryId = Number(getRouterParam(event, 'id'))

  const entry = await db.query.entries.findFirst({ where: eq(schema.entries.id, entryId) })
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Запись не найдена' })
  }
  await requireCarAccess(entry.carId, user.id)

  const body = await readValidatedBody(event, entrySchema.partial().parse)

  await db
    .update(schema.entries)
    .set({
      ...(body.date !== undefined && { date: body.date }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.mileage !== undefined && { mileage: body.mileage }),
      ...(body.cost !== undefined && { cost: body.cost }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.place !== undefined && { place: body.place }),
    })
    .where(eq(schema.entries.id, entryId))

  return (await findEntryWithRelations(entryId)) ?? entry
})
