import { eq } from 'drizzle-orm'
import { db, schema } from '../database'

/** Связи записи в ответах API: категория и автор (без email). */
export const entryRelations = {
  category: true,
  author: { columns: { id: true, name: true } },
} as const

export function findEntryWithRelations(entryId: number) {
  return db.query.entries.findFirst({
    where: eq(schema.entries.id, entryId),
    with: entryRelations,
  })
}
