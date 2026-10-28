import type { AnalyticsPeriod } from '@garage/shared/schemas/analytics'
import type { CarAnalytics } from '@garage/shared/types'
import { formatMoney, formatMonthYear } from '@garage/shared/utils/format'
import type { ColumnChartBar } from '~/utils/columnChart'

/** Выбранный период экрана «Расходы»: `date` — `YYYY-MM` (month), `YYYY` (year), `null` (all) */
export interface ExpensesQuery {
  period: AnalyticsPeriod
  date: string | null
}

export const expensesPeriodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
]

const MONTHS_PREPOSITIONAL = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
] as const

const MONTHS_DATIVE = [
  'январю',
  'февралю',
  'марту',
  'апрелю',
  'маю',
  'июню',
  'июлю',
  'августу',
  'сентябрю',
  'октябрю',
  'ноябрю',
  'декабрю',
] as const

/** Подписи оси графика по месяцам: три буквы, чтобы 12 столбцов помещались в 390 px */
const MONTHS_AXIS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const

const MONTHS_IN_YEAR = 12

function monthNumber(month: string): number {
  return Number(month.slice(5, 7))
}

/** Текущий период для выбранной гранулярности: `2026-10`, `2026` или `null` для «Всё время» */
export function currentQuery(period: AnalyticsPeriod, today: string): ExpensesQuery {
  if (period === 'month') return { period, date: today.slice(0, 7) }
  if (period === 'year') return { period, date: today.slice(0, 4) }
  return { period, date: null }
}

/** Переключение «Месяц / Год / Всё время» сохраняет год: из 2025 года — в декабрь 2025 */
export function changePeriod(
  query: ExpensesQuery,
  period: AnalyticsPeriod,
  today: string,
): ExpensesQuery {
  const current = currentQuery(period, today)
  const year = query.date?.slice(0, 4)
  if (period === 'all' || !year || year === today.slice(0, 4)) return current
  return { period, date: period === 'month' ? `${year}-12` : year }
}

/** Соседний период (`step` = -1 назад, 1 вперёд); для «Всё время» периода нет */
export function shiftQuery(query: ExpensesQuery, step: -1 | 1): ExpensesQuery {
  if (!query.date) return query
  if (query.period === 'year') return { ...query, date: String(Number(query.date) + step) }
  const index = Number(query.date.slice(0, 4)) * MONTHS_IN_YEAR + monthNumber(query.date) - 1 + step
  const month = String((index % MONTHS_IN_YEAR) + 1).padStart(2, '0')
  return { ...query, date: `${Math.floor(index / MONTHS_IN_YEAR)}-${month}` }
}

/** Вперёд дальше текущего периода нельзя */
export function canShowNext(query: ExpensesQuery, today: string): boolean {
  return query.date !== null && query.date < currentQuery(query.period, today).date!
}

/** `2026-07` → `Июль 2026`, `2026` → `2026 год`, `all` → `Всё время` */
export function formatPeriodLabel({ period, date }: ExpensesQuery): string {
  if (period === 'month' && date) return formatMonthYear(date)
  if (period === 'year' && date) return `${date} год`
  return 'Всё время'
}

/** «в июле» (месяц) / «в 2026 году» (год): для «Ближайшие траты — 7 500 ₽ в июне» */
export function formatPeriodIn(period: AnalyticsPeriod, date: string): string {
  return period === 'month' ? `в ${MONTHS_PREPOSITIONAL[monthNumber(date) - 1]}` : `в ${date} году`
}

/** «к июню» (месяц) / «к 2025 году» (год): подпись кнопки перехода */
export function formatPeriodTo(period: AnalyticsPeriod, date: string): string {
  return period === 'month' ? `к ${MONTHS_DATIVE[monthNumber(date) - 1]}` : `к ${date} году`
}

/** «в мае» для месяца этого года, «в мае 2025» для других лет (строка «Больше всего в …») */
export function formatMonthIn(month: string, today: string): string {
  const name = MONTHS_PREPOSITIONAL[monthNumber(month) - 1]
  return month.slice(0, 4) === today.slice(0, 4) ? `в ${name}` : `в ${name} ${month.slice(0, 4)}`
}

/** Содержимое Ж3 «нет трат за период»: заголовок, ближайшие траты и переход к ближайшему периоду */
export interface EmptyPeriodInfo {
  title: string
  message: string | undefined
  /** «К июню»; `null`, если трат нет ни до, ни после (невозможно при `hasAnyExpenses`) */
  actionLabel: string | null
  target: ExpensesQuery | null
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Ж3: «В июле трат не было», «Ближайшие траты — 7 500 ₽ в июне и 9 900 ₽ в августе»,
 * кнопка ведёт к предыдущему периоду с тратами, а если его нет — к следующему.
 */
export function describeEmptyPeriod(
  { period, date }: ExpensesQuery,
  neighbours: Pick<CarAnalytics, 'prevPeriodWithExpenses' | 'nextPeriodWithExpenses'>,
  totals: { prev: number | null; next: number | null },
): EmptyPeriodInfo {
  const sums = [
    { key: neighbours.prevPeriodWithExpenses, total: totals.prev },
    { key: neighbours.nextPeriodWithExpenses, total: totals.next },
  ].flatMap(({ key, total }) =>
    key ? [`${formatMoney(total ?? 0)} ${formatPeriodIn(period, key)}`] : [],
  )
  const lead = sums.length > 1 ? 'Ближайшие траты' : 'Ближайшая трата'
  const target = neighbours.prevPeriodWithExpenses ?? neighbours.nextPeriodWithExpenses
  return {
    title: date ? `${capitalize(formatPeriodIn(period, date))} трат не было` : 'Трат не было',
    message: sums.length ? `${lead} — ${sums.join(' и ')}` : undefined,
    actionLabel: target ? capitalize(formatPeriodTo(period, target)) : null,
    target: target ? { period, date: target } : null,
  }
}

/**
 * Месяцы для графика года: от первого месяца с тратой до текущего — без пустых будущих
 * (и без пустого начала года, как в макете).
 */
function visibleMonths(
  byMonth: CarAnalytics['byMonth'],
  currentMonth: string,
): CarAnalytics['byMonth'] {
  const upToCurrent = byMonth.filter(({ month }) => month <= currentMonth)
  const firstWithExpenses = upToCurrent.findIndex(({ total }) => total > 0)
  return firstWithExpenses > 0 ? upToCurrent.slice(firstWithExpenses) : upToCurrent
}

export interface ExpensesChart {
  bars: ColumnChartBar[]
  /** Акцентный столбец: выбранный/текущий период */
  currentIndex: number | null
  /** Над каким столбцом писать сумму: над выбранным месяцем, иначе над самым большим */
  valueIndex: number | null
}

function peakIndex(values: number[]): number | null {
  const peak = Math.max(...values)
  return peak > 0 ? values.indexOf(peak) : null
}

/**
 * Данные графика: месяц/год — 12 месяцев года периода; «Всё время» — суммы по годам.
 * Месяц выделен для периода «Месяц»; для года и «Всё время» — текущий месяц/год, если он на графике.
 */
export function buildExpensesChart(
  analytics: Pick<CarAnalytics, 'byMonth'>,
  { period, date }: ExpensesQuery,
  today: string,
): ExpensesChart {
  if (period === 'all') {
    const totals = new Map<string, number>()
    for (const { month, total } of analytics.byMonth) {
      const year = month.slice(0, 4)
      totals.set(year, (totals.get(year) ?? 0) + total)
    }
    const bars = [...totals].map(([label, value]) => ({ label, value }))
    const currentIndex = bars.findIndex(({ label }) => label === today.slice(0, 4))
    return {
      bars,
      currentIndex: currentIndex >= 0 ? currentIndex : null,
      valueIndex: peakIndex(bars.map(({ value }) => value)),
    }
  }
  const shown = visibleMonths(analytics.byMonth, today.slice(0, 7))
  const bars = shown.map(({ month, total }) => ({
    label: MONTHS_AXIS[monthNumber(month) - 1]!,
    value: total,
  }))
  const indexOfMonth = (month: string | null) => {
    const index = shown.findIndex((item) => item.month === month)
    return index >= 0 ? index : null
  }
  if (period === 'month') {
    const selected = indexOfMonth(date)
    return { bars, currentIndex: selected, valueIndex: selected }
  }
  const currentIndex = date === today.slice(0, 4) ? indexOfMonth(today.slice(0, 7)) : null
  return { bars, currentIndex, valueIndex: peakIndex(bars.map(({ value }) => value)) }
}
