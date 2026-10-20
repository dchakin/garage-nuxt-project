import { describe, expect, it } from 'vitest'
import { formatMoney } from '@garage/shared/utils/format'
import {
  buildExpensesChart,
  canShowNext,
  changePeriod,
  currentQuery,
  describeEmptyPeriod,
  formatMonthIn,
  formatPeriodLabel,
  shiftQuery,
} from '~/utils/expensesPeriod'

const TODAY = '2026-10-10'

const OCTOBER = { period: 'month', date: '2026-10' } as const
const YEAR_2026 = { period: 'year', date: '2026' } as const

describe('периоды экрана «Расходы»', () => {
  it('текущий период по гранулярности', () => {
    expect(currentQuery('month', TODAY)).toEqual(OCTOBER)
    expect(currentQuery('year', TODAY)).toEqual(YEAR_2026)
    expect(currentQuery('all', TODAY)).toEqual({ period: 'all', date: null })
  })

  it('листание месяцев переходит через границу года', () => {
    expect(shiftQuery({ period: 'month', date: '2026-01' }, -1).date).toBe('2025-12')
    expect(shiftQuery({ period: 'month', date: '2025-12' }, 1).date).toBe('2026-01')
    expect(shiftQuery(OCTOBER, -1).date).toBe('2026-09')
    expect(shiftQuery(YEAR_2026, -1).date).toBe('2025')
    expect(shiftQuery({ period: 'all', date: null }, 1).date).toBeNull()
  })

  it('вперёд дальше текущего периода нельзя', () => {
    expect(canShowNext(OCTOBER, TODAY)).toBe(false)
    expect(canShowNext({ period: 'month', date: '2026-09' }, TODAY)).toBe(true)
    expect(canShowNext(YEAR_2026, TODAY)).toBe(false)
    expect(canShowNext({ period: 'year', date: '2025' }, TODAY)).toBe(true)
    expect(canShowNext({ period: 'all', date: null }, TODAY)).toBe(false)
  })

  it('смена гранулярности сохраняет год прошлых периодов', () => {
    expect(changePeriod(YEAR_2026, 'month', TODAY)).toEqual(OCTOBER)
    expect(changePeriod({ period: 'year', date: '2025' }, 'month', TODAY)).toEqual({
      period: 'month',
      date: '2025-12',
    })
    expect(changePeriod({ period: 'month', date: '2025-03' }, 'year', TODAY)).toEqual({
      period: 'year',
      date: '2025',
    })
    expect(changePeriod(OCTOBER, 'all', TODAY)).toEqual({ period: 'all', date: null })
  })

  it('подписи периода и месяца', () => {
    expect(formatPeriodLabel({ period: 'month', date: '2026-07' })).toBe('Июль 2026')
    expect(formatPeriodLabel(YEAR_2026)).toBe('2026 год')
    expect(formatPeriodLabel({ period: 'all', date: null })).toBe('Всё время')
    expect(formatMonthIn('2026-05', TODAY)).toBe('в мае')
    expect(formatMonthIn('2025-05', TODAY)).toBe('в мае 2025')
  })
})

describe('describeEmptyPeriod (Ж3)', () => {
  const july = { period: 'month', date: '2026-07' } as const

  it('месяц без трат: заголовок, ближайшие суммы и «К июню»', () => {
    const info = describeEmptyPeriod(
      july,
      { prevPeriodWithExpenses: '2026-06', nextPeriodWithExpenses: '2026-08' },
      { prev: 7500, next: 9900 },
    )
    expect(info.title).toBe('В июле трат не было')
    expect(info.message).toBe(
      `Ближайшие траты — ${formatMoney(7500)} в июне и ${formatMoney(9900)} в августе`,
    )
    expect(info.actionLabel).toBe('К июню')
    expect(info.target).toEqual({ period: 'month', date: '2026-06' })
  })

  it('без предыдущего периода кнопка ведёт вперёд', () => {
    const info = describeEmptyPeriod(
      { period: 'month', date: '2026-01' },
      { prevPeriodWithExpenses: null, nextPeriodWithExpenses: '2026-02' },
      { prev: null, next: 6800 },
    )
    expect(info.message).toBe(`Ближайшая трата — ${formatMoney(6800)} в феврале`)
    expect(info.actionLabel).toBe('К февралю')
    expect(info.target).toEqual({ period: 'month', date: '2026-02' })
  })

  it('год без трат', () => {
    const info = describeEmptyPeriod(
      { period: 'year', date: '2025' },
      { prevPeriodWithExpenses: null, nextPeriodWithExpenses: '2026' },
      { prev: null, next: 88500 },
    )
    expect(info.title).toBe('В 2025 году трат не было')
    expect(info.actionLabel).toBe('К 2026 году')
  })
})

describe('buildExpensesChart', () => {
  const byMonth = Array.from({ length: 12 }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, '0')}`,
    total: index === 4 ? 48600 : index === 9 ? 1200 : 0,
  }))

  it('год: 12 столбцов, акцент — текущий месяц, сумма — над пиком', () => {
    const chart = buildExpensesChart({ byMonth }, YEAR_2026, TODAY)
    expect(chart.bars).toHaveLength(12)
    expect(chart.bars[4]).toEqual({ label: 'май', value: 48600 })
    expect(chart.currentIndex).toBe(9)
    expect(chart.valueIndex).toBe(4)
  })

  it('прошлый год: без акцентного столбца', () => {
    expect(
      buildExpensesChart({ byMonth }, { period: 'year', date: '2025' }, TODAY).currentIndex,
    ).toBeNull()
  })

  it('месяц: акцент и сумма — выбранный месяц', () => {
    const chart = buildExpensesChart({ byMonth }, { period: 'month', date: '2026-05' }, TODAY)
    expect(chart.currentIndex).toBe(4)
    expect(chart.valueIndex).toBe(4)
  })

  it('«Всё время» суммирует месяцы по годам', () => {
    const chart = buildExpensesChart(
      {
        byMonth: [
          { month: '2025-12', total: 1000 },
          { month: '2026-01', total: 500 },
          { month: '2026-02', total: 700 },
        ],
      },
      { period: 'all', date: null },
      TODAY,
    )
    expect(chart.bars).toEqual([
      { label: '2025', value: 1000 },
      { label: '2026', value: 1200 },
    ])
    expect(chart.currentIndex).toBe(1)
    expect(chart.valueIndex).toBe(1)
  })
})
