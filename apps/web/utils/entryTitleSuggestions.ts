import type { Entry } from '@garage/shared/types'
import type { EntryType } from '@garage/shared/schemas/entry'

export const TITLE_SUGGESTIONS_LIMIT = 3

interface SuggestionOptions {
  /** Что уже набрано в поле; пусто — подсказываем самые частые */
  query: string
  /** Выбранный тип: описания записей этого типа идут первыми */
  type?: EntryType | null
  limit?: number
}

/**
 * Подсказки для поля «Что сделали» из прошлых записей машины: уникальные описания, сначала
 * записи того же типа, затем самые частые и свежие. Описание, совпадающее с вводом целиком,
 * не предлагается (уже набрано).
 */
export function suggestEntryTitles(
  entries: Pick<Entry, 'description' | 'type' | 'date'>[],
  { query, type, limit = TITLE_SUGGESTIONS_LIMIT }: SuggestionOptions,
): string[] {
  const needle = query.trim().toLowerCase()
  const stats = new Map<string, { title: string; count: number; sameType: boolean; date: string }>()

  for (const entry of entries) {
    const title = entry.description?.trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (needle && (!key.includes(needle) || key === needle)) continue
    const known = stats.get(key)
    const sameType = !!type && entry.type === type
    if (known) {
      known.count += 1
      known.sameType ||= sameType
      if (entry.date > known.date) known.date = entry.date
    } else {
      stats.set(key, { title, count: 1, sameType, date: entry.date })
    }
  }

  return [...stats.values()]
    .sort(
      (a, b) =>
        Number(b.sameType) - Number(a.sameType) ||
        b.count - a.count ||
        b.date.localeCompare(a.date),
    )
    .slice(0, limit)
    .map((suggestion) => suggestion.title)
}
