import type { ReminderTriggerType } from '../schemas/reminder'
import { formatDate, formatMileage, NBSP } from './format'
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

/** «14 фев · 77 200 км» — точка «последнего раза»; `null`, если ни даты, ни пробега */
export function describeLastPoint(
  last: { date: string | null; mileage: number | null },
  today?: string,
): string | null {
  const parts: string[] = []
  if (last.date) parts.push(formatDate(last.date, today))
  if (last.mileage != null) parts.push(formatMileage(last.mileage))
  return parts.length ? parts.join(' · ') : null
}

export interface UpcomingDueInput {
  nextDue: NextDue
  intervalKm: number | null
  intervalMonths: number | null
  last: { date: string | null; mileage: number | null }
}

/**
 * «Следующее — 2 нояб: 2 мая + 6 мес.» (Е4): срок и, если интервал один, откуда он взят.
 * При двух интервалах формулу не выводим — какое условие сработает раньше, зависит от езды.
 */
export function describeUpcomingDue(input: UpcomingDueInput, today?: string): string | null {
  const target = describeNextDue(input.nextDue, today)?.replace(/^на /, '')
  if (!target) return null
  const { intervalKm, intervalMonths, last } = input
  let formula: string | null = null
  if (intervalMonths && !intervalKm && last.date) {
    formula = `${formatDate(last.date, today)} + ${intervalMonths}${NBSP}мес`
  } else if (intervalKm && !intervalMonths && last.mileage != null) {
    formula = `${formatMileage(last.mileage)} + ${formatMileage(intervalKm)}`
  }
  return formula ? `Следующее — ${target}: ${formula}.` : `Следующее — ${target}.`
}

/**
 * Подпись строки «Последний раз»: «Из журнала: 14 фев · 77 200 км», «Указано: …» (введено
 * руками или записи нет), без данных — «отсчёт с сегодня».
 */
export function describeLastSource(
  last: { date: string | null; mileage: number | null },
  options: { fromJournal: boolean; today?: string; note?: string | null },
): string {
  const point = describeLastPoint(last, options.today)
  if (!point) return 'Из журнала не найдено — отсчёт с сегодня'
  if (!options.fromJournal) return `Указано: ${point}`
  return `Из журнала: ${point}${options.note ? ` (${options.note})` : ''}`
}
