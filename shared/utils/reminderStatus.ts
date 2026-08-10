import type { Reminder, ReminderStatus } from '../types'

const SOON_DAYS = 14
const SOON_KM_FALLBACK = 500
const SOON_KM_RATIO = 0.1 // 10% от интервала пробега считается "скоро"

/**
 * Вычисляет статус напоминания относительно текущей даты и пробега авто.
 * Если сработало и по дате, и по пробегу — берётся более "срочный" статус.
 */
export function getReminderStatus(reminder: Reminder, currentMileage: number, today: string = new Date().toISOString().slice(0, 10)): ReminderStatus {
  if (!reminder.isActive) return 'inactive'

  const statuses: ReminderStatus[] = []

  if (reminder.nextDueDate) {
    const dueDate = new Date(reminder.nextDueDate)
    const now = new Date(today)
    const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) statuses.push('overdue')
    else if (diffDays <= SOON_DAYS) statuses.push('soon')
    else statuses.push('ok')
  }

  if (reminder.nextDueMileage != null) {
    const soonKm = reminder.intervalKm ? Math.max(SOON_KM_FALLBACK, Math.round(reminder.intervalKm * SOON_KM_RATIO)) : SOON_KM_FALLBACK
    const diffKm = reminder.nextDueMileage - currentMileage
    if (diffKm < 0) statuses.push('overdue')
    else if (diffKm <= soonKm) statuses.push('soon')
    else statuses.push('ok')
  }

  if (statuses.includes('overdue')) return 'overdue'
  if (statuses.includes('soon')) return 'soon'
  if (statuses.length) return 'ok'
  return 'ok'
}

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  overdue: 'Просрочено',
  soon: 'Скоро',
  ok: 'Ок',
  inactive: 'Неактивно'
}
