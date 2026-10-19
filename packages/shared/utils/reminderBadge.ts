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

/** Порядок групп на экране «Напоминания»: сначала то, что требует внимания, выключенные — в конце. */
export const REMINDER_GROUP_ORDER: ReminderStatus[] = ['overdue', 'soon', 'ok', 'inactive']

/**
 * Напоминания по группам статусов в порядке `REMINDER_GROUP_ORDER`; пустые группы опущены,
 * внутри группы порядок исходного списка сохраняется.
 */
export function groupRemindersByStatus<T extends BadgeReminder>(
  reminders: T[],
  currentMileage: number,
  today?: string,
): { status: ReminderStatus; reminders: T[] }[] {
  const byStatus: Record<ReminderStatus, T[]> = { overdue: [], soon: [], ok: [], inactive: [] }
  for (const reminder of reminders) {
    byStatus[getReminderStatus(reminder, currentMileage, today)].push(reminder)
  }
  return REMINDER_GROUP_ORDER.filter((status) => byStatus[status].length).map((status) => ({
    status,
    reminders: byStatus[status],
  }))
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
