import { describe, expect, it } from 'vitest'
import { groupEntriesByMonth } from '../utils/groupEntries'

const entry = (date: string, cost: number | null) => ({ date, cost })

describe('groupEntriesByMonth', () => {
  it('пустой список — нет групп', () => {
    expect(groupEntriesByMonth([])).toEqual([])
  })

  it('делит записи по месяцам и считает сумму месяца', () => {
    const groups = groupEntriesByMonth([
      entry('2026-10-07', 1_200),
      entry('2026-09-25', 3_500),
      entry('2026-09-12', 6_800),
      entry('2026-08-03', 9_900),
    ])

    expect(groups.map(({ month, total }) => ({ month, total }))).toEqual([
      { month: '2026-10', total: 1_200 },
      { month: '2026-09', total: 10_300 },
      { month: '2026-08', total: 9_900 },
    ])
    expect(groups[1].entries.map(({ date }) => date)).toEqual(['2026-09-25', '2026-09-12'])
  })

  it('запись без стоимости не меняет сумму', () => {
    const [group] = groupEntriesByMonth([entry('2026-09-25', null), entry('2026-09-12', 500)])

    expect(group.total).toBe(500)
    expect(group.entries).toHaveLength(2)
  })

  it('один месяц разных лет — разные группы', () => {
    const groups = groupEntriesByMonth([entry('2026-09-01', 100), entry('2025-09-01', 200)])

    expect(groups.map(({ month }) => month)).toEqual(['2026-09', '2025-09'])
  })

  it('сохраняет порядок входного списка (старые сверху тоже)', () => {
    const groups = groupEntriesByMonth([entry('2026-02-14', 1), entry('2026-03-20', 2)])

    expect(groups.map(({ month }) => month)).toEqual(['2026-02', '2026-03'])
  })
})
