import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const entryId = Number(getRouterParam(event, 'id'))

  const entry = await db.query.entries.findFirst({
    where: eq(schema.entries.id, entryId),
    with: { category: true }
  })
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Запись не найдена' })
  }

  await requireCarAccess(entry.carId, user.id)

  return entry
})
