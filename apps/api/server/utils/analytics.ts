import type { AnalyticsPeriod } from '@garage/shared/schemas/analytics'
import type { CarAnalytics } from '@garage/shared/types'

export interface ExpenseRow {
  /** YYYY-MM-DD */
  date: string
  cost: number | null
  mileage: number | null
  categoryId: number | null
  categoryName: string | null
}

export const UNCATEGORIZED_NAME = 'Без категории'
/** Категория, которая в списке всегда идёт последней */
const OTHER_CATEGORY_NAME = 'Прочее'
/** «Средний в месяц» и «средняя запись» показываются округлёнными */
const AVG_PER_MONTH_STEP = 100
const AVG_ENTRY_STEP = 10
const MONTHS_IN_YEAR = 12

/** Подпись периода → границы по строкам `YYYY-MM`. */
function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * MONTHS_IN_YEAR + Number(month.slice(5, 7)) - 1
}

function monthFromIndex(index: number): string {
  const year = Math.floor(index / MONTHS_IN_YEAR)
  return `${year}-${String((index % MONTHS_IN_YEAR) + 1).padStart(2, '0')}`
}

function periodKey(date: string, period: AnalyticsPeriod): string | null {
  if (period === 'month') return date.slice(0, 7)
  if (period === 'year') return date.slice(0, 4)
  return null
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

/** Целые доли, сумма ровно 100 (метод наибольшего остатка). */
export function computeShares(totals: number[]): number[] {
  const sum = totals.reduce((acc, value) => acc + value, 0)
  if (sum <= 0) return totals.map(() => 0)
  const exact = totals.map((value) => (value / sum) * 100)
  const shares = exact.map(Math.floor)
  let missing = 100 - shares.reduce((acc, value) => acc + value, 0)
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
  for (const { index } of order) {
    if (missing <= 0) break
    shares[index] += 1
    missing -= 1
  }
  return shares
}

function sumByMonth(rows: ExpenseRow[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const month = row.date.slice(0, 7)
    totals.set(month, (totals.get(month) ?? 0) + (row.cost ?? 0))
  }
  return totals
}

function buildByCategory(rows: ExpenseRow[]): CarAnalytics['byCategory'] {
  const groups = new Map<number | null, { name: string; total: number }>()
  for (const row of rows) {
    const group = groups.get(row.categoryId) ?? {
      name: row.categoryName ?? UNCATEGORIZED_NAME,
      total: 0,
    }
    group.total += row.cost ?? 0
    groups.set(row.categoryId, group)
  }
  const isLast = (name: string) => name === OTHER_CATEGORY_NAME || name === UNCATEGORIZED_NAME
  const sorted = [...groups.entries()]
    .map(([categoryId, group]) => ({ categoryId, ...group }))
    .sort((a, b) => Number(isLast(a.name)) - Number(isLast(b.name)) || b.total - a.total)
  const shares = computeShares(sorted.map((group) => group.total))
  return sorted.map((group, index) => ({ ...group, share: shares[index] }))
}

function buildByMonth(
  totals: Map<string, number>,
  period: AnalyticsPeriod,
  periodStart: string,
): CarAnalytics['byMonth'] {
  const months = [...totals.keys()].sort()
  let first: number
  let last: number
  if (period === 'all') {
    if (!months.length) return []
    first = monthIndex(months[0])
    last = monthIndex(months[months.length - 1])
  } else {
    first = Number(periodStart.slice(0, 4)) * MONTHS_IN_YEAR
    last = first + MONTHS_IN_YEAR - 1
  }
  const result: CarAnalytics['byMonth'] = []
  for (let index = first; index <= last; index++) {
    const month = monthFromIndex(index)
    result.push({ month, total: totals.get(month) ?? 0 })
  }
  return result
}

function neighbours(
  allRows: ExpenseRow[],
  period: AnalyticsPeriod,
  current: string | null,
): Pick<CarAnalytics, 'prevPeriodWithExpenses' | 'nextPeriodWithExpenses'> {
  if (period === 'all' || current === null) {
    return { prevPeriodWithExpenses: null, nextPeriodWithExpenses: null }
  }
  const keys = [...new Set(allRows.map((row) => periodKey(row.date, period) as string))].sort()
  return {
    prevPeriodWithExpenses: keys.filter((key) => key < current).pop() ?? null,
    nextPeriodWithExpenses: keys.find((key) => key > current) ?? null,
  }
}

export interface AnalyticsOptions {
  period: AnalyticsPeriod
  /** `YYYY-MM` | `YYYY`; без значения — период, в который попадает `today` */
  date?: string
  /** YYYY-MM-DD */
  today: string
}

export function computeCarAnalytics(
  allEntries: ExpenseRow[],
  options: AnalyticsOptions,
): CarAnalytics {
  const { period, today } = options
  const allRows = allEntries.filter((row) => (row.cost ?? 0) > 0)
  const current = period === 'all' ? null : (options.date ?? periodKey(today, period))
  const rows =
    current === null ? allRows : allRows.filter((r) => periodKey(r.date, period) === current)

  const total = rows.reduce((acc, row) => acc + (row.cost ?? 0), 0)
  const totalsByMonth = sumByMonth(rows)
  const monthsWithExpenses = [...totalsByMonth.keys()].sort()

  let avgPerMonth = 0
  if (monthsWithExpenses.length) {
    // до конца периода, но не дальше текущего месяца (будущее ещё не прошло)
    const periodEndMonth = period === 'year' ? `${current}-12` : (current ?? today.slice(0, 7))
    const lastIndex = Math.max(
      Math.min(monthIndex(periodEndMonth), monthIndex(today.slice(0, 7))),
      monthIndex(monthsWithExpenses[monthsWithExpenses.length - 1]),
    )
    const monthsCount = lastIndex - monthIndex(monthsWithExpenses[0]) + 1
    avgPerMonth = roundTo(total / monthsCount, AVG_PER_MONTH_STEP)
  }

  const mileages = rows.flatMap((row) => (row.mileage === null ? [] : [row.mileage]))
  const distance = mileages.length >= 2 ? Math.max(...mileages) - Math.min(...mileages) : 0
  const costPerKm = distance > 0 ? Math.round((total / distance) * 10) / 10 : 0

  const top = [...totalsByMonth.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]

  return {
    total,
    avgPerMonth,
    costPerKm,
    avgEntry: rows.length ? roundTo(total / rows.length, AVG_ENTRY_STEP) : 0,
    topMonth: top ? { month: top[0], total: top[1] } : null,
    byMonth: buildByMonth(sumByMonth(allRows), period, current ?? today),
    byCategory: buildByCategory(rows),
    hasAnyExpenses: allRows.length > 0,
    ...neighbours(allRows, period, current),
  }
}
