import { describe, expect, it } from 'vitest'
import type { CarAnalytics } from '@garage/shared/types'
import { analyticsWithoutEntries } from '~/utils/analyticsWithoutEntries'

const analytics: CarAnalytics = {
  total: 1_200,
  avgPerMonth: 9_800,
  costPerKm: 0,
  avgEntry: 0,
  topMonth: null,
  byMonth: [
    { month: '2026-09', total: 10_300 },
    { month: '2026-10', total: 1_200 },
  ],
  byCategory: [],
  hasAnyExpenses: true,
  prevPeriodWithExpenses: null,
  nextPeriodWithExpenses: null,
}

describe('analyticsWithoutEntries', () => {
  it('вычитает удаляемую запись из суммы месяца и его столбца', () => {
    const result = analyticsWithoutEntries(
      analytics,
      [{ date: '2026-10-07', cost: 1_200 }],
      '2026-10',
    )
    expect(result.total).toBe(0)
    expect(result.byMonth.at(-1)?.total).toBe(0)
    expect(result.byMonth[0]?.total).toBe(10_300)
    expect(analytics.total).toBe(1_200)
  })

  it('запись другого месяца не меняет сумму периода, но уменьшает свой столбец', () => {
    const result = analyticsWithoutEntries(
      analytics,
      [{ date: '2026-09-12', cost: 6_800 }],
      '2026-10',
    )
    expect(result.total).toBe(1_200)
    expect(result.byMonth[0]?.total).toBe(3_500)
  })

  it('без суммы или без записей возвращает те же данные', () => {
    expect(
      analyticsWithoutEntries(analytics, [{ date: '2026-10-07', cost: null }], '2026-10'),
    ).toBe(analytics)
    expect(analyticsWithoutEntries(analytics, [], '2026-10')).toBe(analytics)
  })

  it('сумма не уходит в минус', () => {
    const result = analyticsWithoutEntries(
      analytics,
      [{ date: '2026-10-07', cost: 5_000 }],
      '2026-10',
    )
    expect(result.total).toBe(0)
  })
})
