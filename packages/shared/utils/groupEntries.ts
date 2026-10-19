import type { Entry } from '../types'

/** Месяц журнала: `month` — `YYYY-MM`, `total` — сумма трат (запись без стоимости — 0). */
export interface EntryMonthGroup<T extends Pick<Entry, 'date' | 'cost'> = Entry> {
  month: string
  total: number
  entries: T[]
}

/** Длина `YYYY-MM` в начале даты `YYYY-MM-DD` */
const MONTH_KEY_LENGTH = 7

/**
 * Группирует записи по месяцу даты. Группы идут в порядке первого появления месяца во входном
 * списке, записи внутри группы сохраняют входной порядок (API отдаёт новые сверху).
 */
export function groupEntriesByMonth<T extends Pick<Entry, 'date' | 'cost'>>(
  entries: T[],
): EntryMonthGroup<T>[] {
  const groups = new Map<string, EntryMonthGroup<T>>()
  for (const entry of entries) {
    const month = entry.date.slice(0, MONTH_KEY_LENGTH)
    const group = groups.get(month) ?? { month, total: 0, entries: [] }
    group.total += entry.cost ?? 0
    group.entries.push(entry)
    groups.set(month, group)
  }
  return [...groups.values()]
}
