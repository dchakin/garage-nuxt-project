import type { Entry, Reminder, ReminderStatus } from '../types'
import { formatDate, formatDays, formatMileage, NBSP, todayIso } from './format'
import { daysUntil, getReminderStatus } from './reminderStatus'

const AVG_DAYS_PER_MONTH = 30.44

type RemainingReminder = Pick<
  Reminder,
  'isActive' | 'nextDueDate' | 'nextDueMileage' | 'intervalKm'
> & { intervalMonths?: number | null }

type DueDimension = 'date' | 'mileage'

export interface ReminderRemainingContext {
  currentMileage: number
  /** `YYYY-MM-DD`, по умолчанию — сегодня (локальная дата). */
  today?: string
  /** Средний пробег в месяц (`averageKmPerMonth`); без него оценки «≈ N мес» нет. */
  avgKmPerMonth?: number | null
}

/** Остаток до срока, разобранный на части для карточки напоминания. */
export interface ReminderRemaining {
  status: ReminderStatus
  /** По какому условию считан остаток; `null` — выключено или срок не задан */
  dimension: DueDimension | null
  /** Фраза целиком: «Просрочено на 250 км», «Через 12 550 км, ≈ 10 мес» */
  text: string
  /** Крупная часть (цвет статуса): «Просрочено», «Через 8 дней», «Через 12 550 км» */
  headline: string
  /** Мелкая строка под ней: «на 250 км», «18 окт» (дата срока), «≈ 10 мес» */
  detail: string | null
  /** Доля пройденного интервала 0…1 (полоса): просрочено — 1, выключено/без интервала — 0 */
  progress: number
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
 * Остаток до срока напоминания по частям. Статус берётся из `getReminderStatus`; если сработали
 * оба условия с одним статусом — берётся то, что наступит раньше (по `avgKmPerMonth`),
 * без среднего пробега — дата.
 */
export function getReminderRemaining(
  reminder: RemainingReminder,
  { currentMileage, today = todayIso(), avgKmPerMonth = null }: ReminderRemainingContext,
): ReminderRemaining {
  const status = getReminderStatus(reminder, currentMileage, today)
  if (status === 'inactive') return plain(status, 'Выключено')

  const daysLeft = reminder.nextDueDate ? daysUntil(reminder.nextDueDate, today) : null
  const kmLeft = reminder.nextDueMileage != null ? reminder.nextDueMileage - currentMileage : null

  const dateMatches =
    daysLeft != null && dimensionStatus(reminder, 'date', currentMileage, today) === status
  const kmMatches =
    kmLeft != null && dimensionStatus(reminder, 'mileage', currentMileage, today) === status

  const byDate = (days: number) => {
    const dueDate = formatDate(reminder.nextDueDate!, today)
    const intervalDays = reminder.intervalMonths
      ? reminder.intervalMonths * AVG_DAYS_PER_MONTH
      : null
    return describeDays(status, days, dueDate, elapsedShare(days, intervalDays))
  }
  const byKm = (km: number) =>
    describeKm(status, km, avgKmPerMonth, elapsedShare(km, reminder.intervalKm))

  if (daysLeft != null && kmLeft != null && dateMatches && kmMatches) {
    return avgKmPerMonth && (kmLeft / avgKmPerMonth) * AVG_DAYS_PER_MONTH < daysLeft
      ? byKm(kmLeft)
      : byDate(daysLeft)
  }
  if (kmLeft != null && kmMatches) return byKm(kmLeft)
  if (daysLeft != null) return byDate(daysLeft)
  return plain(status, 'Срок не задан')
}

/**
 * Остаток до срока одной фразой: «Через 750 км», «Просрочено на 39 дней»,
 * «Через 12 550 км, ≈ 10 мес». Правила выбора — `getReminderRemaining`.
 */
export function formatReminderRemaining(
  reminder: RemainingReminder,
  context: ReminderRemainingContext,
): string {
  return getReminderRemaining(reminder, context).text
}

/** Правило напоминания: «Каждые 10 000 км или 12 мес», «Каждые 12 мес», без интервала — ''. */
export function formatReminderInterval(
  reminder: Pick<Reminder, 'intervalKm' | 'intervalMonths'>,
): string {
  const parts = [
    reminder.intervalKm ? formatMileage(reminder.intervalKm) : null,
    reminder.intervalMonths ? `${reminder.intervalMonths}${NBSP}мес` : null,
  ].filter(Boolean)
  return parts.length ? `Каждые ${parts.join(' или ')}` : ''
}

/** Статус только по одному условию — через тот же `getReminderStatus`. */
function dimensionStatus(
  reminder: RemainingReminder,
  dimension: DueDimension,
  currentMileage: number,
  today: string,
): ReminderStatus {
  const only =
    dimension === 'date'
      ? { ...reminder, nextDueMileage: null }
      : { ...reminder, nextDueDate: null }
  return getReminderStatus(only, currentMileage, today)
}

/** Доля пройденного интервала: 1 − остаток / интервал, обрезается в 0…1. */
function elapsedShare(left: number, interval: number | null | undefined): number {
  if (!interval) return 0
  return Math.min(Math.max(1 - left / interval, 0), 1)
}

function plain(status: ReminderStatus, text: string): ReminderRemaining {
  return { status, dimension: null, text, headline: text, detail: null, progress: 0 }
}

function overdue(
  status: ReminderStatus,
  dimension: DueDimension,
  amount: string,
): ReminderRemaining {
  const detail = `на ${amount}`
  return {
    status,
    dimension,
    text: `Просрочено ${detail}`,
    headline: 'Просрочено',
    detail,
    progress: 1,
  }
}

function describeDays(
  status: ReminderStatus,
  daysLeft: number,
  dueDate: string,
  progress: number,
): ReminderRemaining {
  if (daysLeft < 0) return overdue(status, 'date', formatDays(-daysLeft))
  const text = daysLeft === 0 ? 'Сегодня' : `Через ${formatDays(daysLeft)}`
  return { status, dimension: 'date', text, headline: text, detail: dueDate, progress }
}

function describeKm(
  status: ReminderStatus,
  kmLeft: number,
  avgKmPerMonth: number | null,
  progress: number,
): ReminderRemaining {
  if (kmLeft < 0) return overdue(status, 'mileage', formatMileage(-kmLeft))
  const headline = kmLeft === 0 ? 'Пора' : `Через ${formatMileage(kmLeft)}`
  // Меньше месяца езды — оценка «≈ 1 мес» ничего не добавляет
  const detail =
    kmLeft > 0 && avgKmPerMonth && kmLeft >= avgKmPerMonth
      ? `≈${NBSP}${Math.round(kmLeft / avgKmPerMonth)}${NBSP}мес`
      : null
  const text = detail ? `${headline}, ${detail}` : headline
  return { status, dimension: 'mileage', text, headline, detail, progress }
}

/**
 * Ближайший срок среди включённых напоминаний (Г3): сроки в днях и в километрах сравниваются
 * через средний пробег; без него километровые сроки считаются дальше датных.
 */
export function pickNearestReminder<T extends RemainingReminder>(
  reminders: readonly T[],
  context: ReminderRemainingContext,
): { reminder: T; remaining: ReminderRemaining } | null {
  const today = context.today ?? todayIso()
  const avgKmPerMonth = context.avgKmPerMonth ?? null
  let best: { reminder: T; remaining: ReminderRemaining; days: number } | null = null
  for (const reminder of reminders) {
    if (!reminder.isActive) continue
    const remaining = getReminderRemaining(reminder, { ...context, today })
    const days = estimateDaysLeft(reminder, remaining, context.currentMileage, today, avgKmPerMonth)
    if (days != null && (!best || days < best.days)) best = { reminder, remaining, days }
  }
  return best && { reminder: best.reminder, remaining: best.remaining }
}

function estimateDaysLeft(
  reminder: RemainingReminder,
  remaining: ReminderRemaining,
  currentMileage: number,
  today: string,
  avgKmPerMonth: number | null,
): number | null {
  if (remaining.dimension === 'date' && reminder.nextDueDate) {
    return daysUntil(reminder.nextDueDate, today)
  }
  if (remaining.dimension === 'mileage' && reminder.nextDueMileage != null) {
    const kmLeft = reminder.nextDueMileage - currentMileage
    return avgKmPerMonth ? (kmLeft / avgKmPerMonth) * AVG_DAYS_PER_MONTH : Number.MAX_SAFE_INTEGER
  }
  return null
}

/**
 * Подпись «такое напоминание уже есть» (Е3): «Каждые 10 000 км или 12 мес, просрочено на 250 км.
 * Откройте его, чтобы изменить интервал.»
 */
export function describeExistingReminder(
  reminder: RemainingReminder & Pick<Reminder, 'intervalMonths'>,
  context: ReminderRemainingContext,
): string {
  const { text } = getReminderRemaining(reminder, context)
  const status = `${text.charAt(0).toLowerCase()}${text.slice(1)}`
  return `${formatReminderInterval(reminder)}, ${status}. Откройте его, чтобы изменить интервал.`
}
