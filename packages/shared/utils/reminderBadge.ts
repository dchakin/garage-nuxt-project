import type { Reminder, ReminderStatus } from '../types'
import { getReminderStatus } from './reminderStatus'

type BadgeReminder = Pick<Reminder, 'isActive' | 'nextDueDate' | 'nextDueMileage' | 'intervalKm'>

/** Сколько напоминаний в каждом статусе (выключенные — `inactive`). */
export function countRemindersByStatus(
  reminders: BadgeReminder[],
  currentMileage: number,
  today?: string,
): Record<ReminderStatus, number> {
  const counts: Record<ReminderStatus, number> = { overdue: 0, soon: 0, ok: 0, inactive: 0 }
  for (const reminder of reminders) {
    counts[getReminderStatus(reminder, currentMileage, today)] += 1
  }
  return counts
}

/** Бейдж вкладки «Напоминания»: просроченные + скорые среди включённых. */
export function countAttentionReminders(
  reminders: BadgeReminder[],
  currentMileage: number,
  today?: string,
): number {
  const counts = countRemindersByStatus(reminders, currentMileage, today)
  return counts.overdue + counts.soon
}
