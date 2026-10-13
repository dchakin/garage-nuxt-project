import type { Entry, Reminder, ReminderStatus } from '../types'
import { formatDays, formatMileage, NBSP, todayIso } from './format'
import { daysUntil, getReminderStatus } from './reminderStatus'

const AVG_DAYS_PER_MONTH = 30.44

type RemainingReminder = Pick<
  Reminder,
  'isActive' | 'nextDueDate' | 'nextDueMileage' | 'intervalKm'
>

export interface ReminderRemainingContext {
  currentMileage: number
  /** `YYYY-MM-DD`, по умолчанию — сегодня (локальная дата). */
  today?: string
  /** Средний пробег в месяц (`averageKmPerMonth`); без него оценки «≈ N мес» нет. */
  avgKmPerMonth?: number | null
}

/**
 * Средний пробег в месяц по записям с пробегом: разница пробега между самой ранней и самой
 * поздней записью, делённая на число календарных месяцев между ними. `null`, если данных мало.
 */
export function averageKmPerMonth(entries: Pick<Entry, 'date' | 'mileage'>[]): number | null {
  const withMileage = entries
    .filter((entry): entry is typeof entry & { mileage: number } => entry.mileage != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (withMileage.length < 2) return null

  const first = withMileage[0]
  const last = withMileage[withMileage.length - 1]
  const [firstYear, firstMonth] = first.date.split('-').map(Number)
  const [lastYear, lastMonth] = last.date.split('-').map(Number)
  const months = (lastYear - firstYear) * 12 + (lastMonth - firstMonth)
  const km = last.mileage - first.mileage
  if (months < 1 || km <= 0) return null
  return km / months
}

/**
 * Остаток до срока напоминания: «Через 750 км», «Просрочено на 39 дней»,
 * «Через 12 550 км, ≈ 10 мес». Статус берётся из `getReminderStatus`; если сработали оба
 * условия с одним статусом — показывается то, что наступит раньше (по `avgKmPerMonth`),
 * без среднего пробега — дата.
 */
export function formatReminderRemaining(
  reminder: RemainingReminder,
  { currentMileage, today = todayIso(), avgKmPerMonth = null }: ReminderRemainingContext,
): string {
  const status = getReminderStatus(reminder, currentMileage, today)
  if (status === 'inactive') return 'Выключено'

  const daysLeft = reminder.nextDueDate ? daysUntil(reminder.nextDueDate, today) : null
  const kmLeft = reminder.nextDueMileage != null ? reminder.nextDueMileage - currentMileage : null

  const dateMatches =
    daysLeft != null && dimensionStatus(reminder, 'date', currentMileage, today) === status
  const kmMatches =
    kmLeft != null && dimensionStatus(reminder, 'mileage', currentMileage, today) === status

  if (daysLeft != null && kmLeft != null && dateMatches && kmMatches) {
    return avgKmPerMonth && (kmLeft / avgKmPerMonth) * AVG_DAYS_PER_MONTH < daysLeft
      ? describeKm(kmLeft, avgKmPerMonth)
      : describeDays(daysLeft)
  }
  if (kmLeft != null && kmMatches) return describeKm(kmLeft, avgKmPerMonth)
  if (daysLeft != null) return describeDays(daysLeft)
  return 'Срок не задан'
}

/** Статус только по одному условию — через тот же `getReminderStatus`. */
function dimensionStatus(
  reminder: RemainingReminder,
  dimension: 'date' | 'mileage',
  currentMileage: number,
  today: string,
): ReminderStatus {
  const only =
    dimension === 'date'
      ? { ...reminder, nextDueMileage: null }
      : { ...reminder, nextDueDate: null }
  return getReminderStatus(only, currentMileage, today)
}

function describeDays(daysLeft: number): string {
  if (daysLeft < 0) return `Просрочено на ${formatDays(-daysLeft)}`
  if (daysLeft === 0) return 'Сегодня'
  return `Через ${formatDays(daysLeft)}`
}

function describeKm(kmLeft: number, avgKmPerMonth: number | null): string {
  if (kmLeft < 0) return `Просрочено на ${formatMileage(-kmLeft)}`
  if (kmLeft === 0) return 'Пора'
  const text = `Через ${formatMileage(kmLeft)}`
  // Меньше месяца езды — оценка «≈ 1 мес» ничего не добавляет
  if (!avgKmPerMonth || kmLeft < avgKmPerMonth) return text
  return `${text}, ≈${NBSP}${Math.round(kmLeft / avgKmPerMonth)}${NBSP}мес`
}
