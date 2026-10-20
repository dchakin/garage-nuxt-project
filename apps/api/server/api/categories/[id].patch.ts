import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { categorySchema } from '@garage/shared/schemas/category'
import { categoryNameTaken, requireOwnCategory } from '../../utils/categories'

export default defineEventHandler(async (event) => {
  const { category, carId } = await requireOwnCategory(event)
  const body = await readValidatedBody(event, categorySchema.parse)

  if (await categoryNameTaken(carId, body.name, category.id)) {
    throw createError({ statusCode: 409, statusMessage: 'Такая категория уже существует' })
  }

  const [updated] = await db
    .update(schema.categories)
    .set({ name: body.name })
    .where(eq(schema.categories.id, category.id))
    .returning()
  return updated
})
