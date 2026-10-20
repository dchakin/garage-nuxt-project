import { db, schema } from '../../../database'
import { categorySchema } from '@garage/shared/schemas/category'
import { categoryNameTaken } from '../../../utils/categories'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  await requireCarAccess(carId, user.id)
  const body = await readValidatedBody(event, categorySchema.parse)

  if (await categoryNameTaken(carId, body.name)) {
    throw createError({ statusCode: 409, statusMessage: 'Такая категория уже существует' })
  }

  const [category] = await db
    .insert(schema.categories)
    .values({ carId, name: body.name, isDefault: false })
    .returning()
  return { ...category, entriesCount: 0 }
})
