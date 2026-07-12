import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { categorySchema } from '~~/shared/schemas/category'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const body = await readValidatedBody(event, categorySchema.parse)

  const existing = await db.query.categories.findFirst({ where: eq(schema.categories.name, body.name) })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Такая категория уже существует' })
  }

  const [category] = await db.insert(schema.categories).values({ name: body.name, isDefault: false }).returning()
  return category
})
