import { eq, inArray } from 'drizzle-orm'
import { db, schema } from '../../database'

/**
 * Удаляет аккаунт. Машины-владения, членства, push-подписки и токены уходят каскадом (FK users).
 * Записи пользователя в чужих машинах тоже удаляются, поэтому ссылки напоминаний на них снимаются.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  db.transaction((tx) => {
    const ownEntryIds = tx
      .select({ id: schema.entries.id })
      .from(schema.entries)
      .where(eq(schema.entries.authorId, user.id))
      .all()
      .map((row) => row.id)
    if (ownEntryIds.length) {
      tx.update(schema.reminders)
        .set({ lastEntryId: null })
        .where(inArray(schema.reminders.lastEntryId, ownEntryIds))
        .run()
    }
    tx.delete(schema.users).where(eq(schema.users.id, user.id)).run()
  })

  await clearCookieSession(event)
  return { ok: true }
})
