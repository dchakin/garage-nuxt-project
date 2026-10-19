import type { CarAnalytics, Entry } from '@garage/shared/types'

/**
 * Аналитика без записей, которые уже убраны из UI, но ещё не удалены на сервере (отложенное
 * удаление): сумма периода и столбец месяца уменьшаются сразу. Остальные показатели
 * (среднее, категории) пересчитает сервер после DELETE.
 *
 * @param month месяц периода `YYYY-MM`, для которого посчитан `analytics.total`
 */
export function analyticsWithoutEntries(
  analytics: CarAnalytics,
  removed: Pick<Entry, 'date' | 'cost'>[],
  month: string,
): CarAnalytics {
  const paid = removed.filter((entry) => entry.cost !== null && entry.cost > 0)
  if (!paid.length) return analytics

  const byMonth = analytics.byMonth.map((item) => ({ ...item }))
  let total = analytics.total
  for (const entry of paid) {
    const cost = entry.cost ?? 0
    const entryMonth = entry.date.slice(0, 7)
    if (entryMonth === month) total = Math.max(0, total - cost)
    const bar = byMonth.find((item) => item.month === entryMonth)
    if (bar) bar.total = Math.max(0, bar.total - cost)
  }
  return { ...analytics, total, byMonth }
}
