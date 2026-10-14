import { findEntryWithRelations } from '../../utils/entryRelations'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const entryId = Number(getRouterParam(event, 'id'))

  const entry = await findEntryWithRelations(entryId)
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Запись не найдена' })
  }

  await requireCarAccess(entry.carId, user.id)

  return entry
})
