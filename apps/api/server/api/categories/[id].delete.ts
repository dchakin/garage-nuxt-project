import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../../database'
import { FALLBACK_CATEGORY_NAME, requireOwnCategory } from '../../utils/categories'

export default defineEventHandler(async (event) => {
  const { category } = await requireOwnCategory(event)

  db.transaction((tx) => {
    const fallback = tx
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(isNull(schema.categories.carId), eq(schema.categories.name, FALLBACK_CATEGORY_NAME)),
      )
      .get()

    tx.update(schema.entries)
      .set({ categoryId: fallback?.id ?? null })
      .where(eq(schema.entries.categoryId, category.id))
      .run()
    tx.update(schema.reminders)
      .set({ categoryId: null })
      .where(eq(schema.reminders.categoryId, category.id))
      .run()
    tx.delete(schema.categories).where(eq(schema.categories.id, category.id)).run()
  })

  return { ok: true }
})
