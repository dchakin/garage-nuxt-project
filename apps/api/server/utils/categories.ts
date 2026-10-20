import { and, eq, isNull, ne, or } from 'drizzle-orm'
import { db, schema } from '../database'

/** Стандартная категория, куда переезжают записи удаляемой категории */
export const FALLBACK_CATEGORY_NAME = 'Прочее'

/** Имя занято среди стандартных и своих категорий машины (кроме `exceptId`) */
export async function categoryNameTaken(carId: number, name: string, exceptId?: number) {
  const sameName = and(
    or(isNull(schema.categories.carId), eq(schema.categories.carId, carId)),
    eq(schema.categories.name, name),
  )
  const found = await db.query.categories.findFirst({
    where: exceptId === undefined ? sameName : and(sameName, ne(schema.categories.id, exceptId)),
  })
  return Boolean(found)
}

/** Своя категория машины по `id` из пути; стандартные неизменяемы (403), чужие — по доступу к машине */
export async function requireOwnCategory(event: Parameters<typeof requireAuth>[0]) {
  const { user } = await requireAuth(event)
  const categoryId = Number(getRouterParam(event, 'id'))

  const category = await db.query.categories.findFirst({
    where: eq(schema.categories.id, categoryId),
  })
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Категория не найдена' })
  }
  if (category.carId === null) {
    throw createError({ statusCode: 403, statusMessage: 'Стандартную категорию нельзя изменить' })
  }
  await requireCarAccess(category.carId, user.id)
  return { category, carId: category.carId }
}
