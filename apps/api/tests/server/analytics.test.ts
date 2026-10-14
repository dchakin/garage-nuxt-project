import { describe, expect, it } from 'vitest'
import { computeCarAnalytics, computeShares, type ExpenseRow } from '../../server/utils/analytics'

const TODAY = '2026-10-10'

function row(
  date: string,
  cost: number,
  mileage: number,
  categoryId: number | null,
  categoryName: string | null,
): ExpenseRow {
  return { date, cost, mileage, categoryId, categoryName }
}

// Эталонные записи Camry 2026 г. (88 500 ₽)
const camry: ExpenseRow[] = [
  row('2026-10-07', 1200, 87450, 6, 'Прочее'),
  row('2026-09-25', 3500, 87330, 6, 'Прочее'),
  row('2026-09-12', 6800, 87200, 6, 'Прочее'),
  row('2026-08-03', 9900, 86100, 5, 'Электрика'),
  row('2026-06-11', 7500, 84000, 4, 'Подвеска'),
  row('2026-05-02', 48600, 82100, 3, 'Шины'),
  row('2026-03-20', 4200, 79800, 2, 'Тормоза'),
  row('2026-02-14', 6800, 77200, 1, 'Масло и фильтры'),
]

describe('computeShares', () => {
  it('даёт целые доли с суммой 100', () => {
    const shares = computeShares([1, 1, 1])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('нулевая сумма — нули', () => {
    expect(computeShares([0, 0])).toEqual([0, 0])
  })
})

describe('computeCarAnalytics', () => {
  it('год 2026 на эталонных данных', () => {
    const result = computeCarAnalytics(camry, { period: 'year', date: '2026', today: TODAY })
    expect(result.total).toBe(88500)
    expect(result.avgPerMonth).toBe(9800)
    expect(result.costPerKm).toBe(8.6)
    expect(result.avgEntry).toBe(11060)
    expect(result.topMonth).toEqual({ month: '2026-05', total: 48600 })
    expect(result.byCategory.map((c) => c.share)).toEqual([55, 11, 8, 8, 5, 13])
    expect(result.byCategory.at(-1)?.name).toBe('Прочее')
    expect(result.byMonth).toHaveLength(12)
    expect(result.byMonth[4]).toEqual({ month: '2026-05', total: 48600 })
    expect(result.hasAnyExpenses).toBe(true)
    expect(result.prevPeriodWithExpenses).toBeNull()
    expect(result.nextPeriodWithExpenses).toBeNull()
  })

  it('без date берёт текущий год', () => {
    expect(computeCarAnalytics(camry, { period: 'year', today: TODAY }).total).toBe(88500)
  })

  it('месяц без трат: total 0, соседние периоды', () => {
    const result = computeCarAnalytics(camry, { period: 'month', date: '2026-07', today: TODAY })
    expect(result.total).toBe(0)
    expect(result.topMonth).toBeNull()
    expect(result.byCategory).toEqual([])
    expect(result.hasAnyExpenses).toBe(true)
    expect(result.prevPeriodWithExpenses).toBe('2026-06')
    expect(result.nextPeriodWithExpenses).toBe('2026-08')
  })

  it('месяц: сентябрь', () => {
    const result = computeCarAnalytics(camry, { period: 'month', date: '2026-09', today: TODAY })
    expect(result.total).toBe(10300)
    expect(result.costPerKm).toBe(Math.round((10300 / 130) * 10) / 10)
  })

  it('all: ряд по месяцам непрерывный', () => {
    const result = computeCarAnalytics(camry, { period: 'all', today: TODAY })
    expect(result.total).toBe(88500)
    expect(result.byMonth[0].month).toBe('2026-02')
    expect(result.byMonth.at(-1)?.month).toBe('2026-10')
    expect(result.byMonth).toHaveLength(9)
  })

  it('прошлый год: соседние годы', () => {
    const rows = [row('2024-01-05', 100, 1, null, null), ...camry]
    const result = computeCarAnalytics(rows, { period: 'year', date: '2025', today: TODAY })
    expect(result.total).toBe(0)
    expect(result.prevPeriodWithExpenses).toBe('2024')
    expect(result.nextPeriodWithExpenses).toBe('2026')
  })

  it('без трат: hasAnyExpenses false; записи без суммы не считаются', () => {
    const empty = computeCarAnalytics([], { period: 'year', today: TODAY })
    expect(empty.hasAnyExpenses).toBe(false)
    expect(empty.total).toBe(0)
    const free: ExpenseRow = {
      date: '2026-01-01',
      cost: null,
      mileage: 1,
      categoryId: null,
      categoryName: null,
    }
    expect(computeCarAnalytics([free], { period: 'all', today: TODAY }).hasAnyExpenses).toBe(false)
  })

  it('запись без категории — «Без категории»', () => {
    const result = computeCarAnalytics([row('2026-01-01', 100, 1, null, null)], {
      period: 'year',
      today: TODAY,
    })
    expect(result.byCategory).toEqual([
      { categoryId: null, name: 'Без категории', total: 100, share: 100 },
    ])
  })
})
