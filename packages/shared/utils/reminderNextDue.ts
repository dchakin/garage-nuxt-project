import type { ReminderTriggerType } from '../schemas/reminder'
import { formatDate, formatMileage } from './format'
import { computeNextDue } from './reminderDue'

export interface NextDueSource {
  triggerType: ReminderTriggerType
  intervalKm: number | null
  intervalMonths: number | null
  nextDueDate: string | null
  nextDueMileage: number | null
}

export interface NextDue {
  nextDueDate: string | null
  nextDueMileage: number | null
}

/**
 * Предпросмотр срока после закрытия напоминания записью — `computeNextDue`, тот же код,
 * что у сервера: интервал считается от записи, иначе остаётся прежний срок.
 */
export function previewNextDue(
  reminder: NextDueSource,
  closing: { date: string; mileage: number | null },
): NextDue {
  return computeNextDue({
    triggerType: reminder.triggerType,
    intervalKm: reminder.intervalKm,
    intervalMonths: reminder.intervalMonths,
    lastEntry: closing,
    nextDueDateOverride: reminder.nextDueDate,
    nextDueMileageOverride: reminder.nextDueMileage,
  })
}

/** «на 97 450 км или 10 окт 2027»; `null`, если срок не задан */
export function describeNextDue(nextDue: NextDue, today?: string): string | null {
  const parts: string[] = []
  if (nextDue.nextDueMileage != null) parts.push(formatMileage(nextDue.nextDueMileage))
  if (nextDue.nextDueDate) parts.push(formatDate(nextDue.nextDueDate, today))
  return parts.length ? `на ${parts.join(' или ')}` : null
}

/** Текст toast после «Сделал»: «Срок сдвинут: следующая замена на 97 450 км» (пробег важнее даты) */
export function formatReminderShifted(
  reminder: { title: string } & NextDue,
  today?: string,
): string {
  const noun = /^замена/i.test(reminder.title.trim()) ? 'следующая замена' : 'следующий срок'
  const target = describeNextDue(
    reminder.nextDueMileage != null
      ? { nextDueDate: null, nextDueMileage: reminder.nextDueMileage }
      : reminder,
    today,
  )
  return target ? `Срок сдвинут: ${noun} ${target}` : 'Срок сдвинут'
}
