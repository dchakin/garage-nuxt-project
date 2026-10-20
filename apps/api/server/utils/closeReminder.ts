import { eq } from 'drizzle-orm'
import { db, schema } from '../database'
import { computeNextDue } from '@garage/shared/utils/reminderDue'

/**
 * Закрывает напоминание записью: запись становится `lastEntryId`, срок пересчитывается
 * от неё, а отправленные уведомления сбрасываются — по новому сроку push уйдёт снова.
 */
export async function closeReminderWithEntry(
  reminder: typeof schema.reminders.$inferSelect,
  entry: { id: number; date: string; mileage: number | null },
) {
  const { nextDueDate, nextDueMileage } = computeNextDue({
    triggerType: reminder.triggerType,
    intervalMonths: reminder.intervalMonths,
    intervalKm: reminder.intervalKm,
    lastEntry: entry,
    nextDueDateOverride: reminder.nextDueDate,
    nextDueMileageOverride: reminder.nextDueMileage,
  })

  await db
    .delete(schema.reminderNotifications)
    .where(eq(schema.reminderNotifications.reminderId, reminder.id))
  const [updated] = await db
    .update(schema.reminders)
    .set({ lastEntryId: entry.id, nextDueDate, nextDueMileage })
    .where(eq(schema.reminders.id, reminder.id))
    .returning()
  return updated
}
