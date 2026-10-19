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

/** Сколько напоминаний показывает блок «Требует внимания» на Обзоре. */
export const ATTENTION_LIMIT = 3

/**
 * Напоминания для «Требует внимания»: просроченные, затем скорые (внутри статуса порядок
 * сохраняется), не больше `limit`. Выключенные и «в порядке» не попадают.
 */
export function pickAttentionReminders<T extends BadgeReminder>(
  reminders: T[],
  currentMileage: number,
  today?: string,
  limit: number = ATTENTION_LIMIT,
): T[] {
  const withStatus = reminders.map((reminder) => ({
    reminder,
    status: getReminderStatus(reminder, currentMileage, today),
  }))
  const overdue = withStatus.filter(({ status }) => status === 'overdue')
  const soon = withStatus.filter(({ status }) => status === 'soon')
  return [...overdue, ...soon].slice(0, limit).map(({ reminder }) => reminder)
}
