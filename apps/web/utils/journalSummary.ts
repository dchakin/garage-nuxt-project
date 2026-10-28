import type { Entry } from '@garage/shared/types'
import { formatMoney, pluralize } from '@garage/shared/utils/format'

const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const

type SummaryEntry = Pick<Entry, 'date' | 'cost'>

/**
 * Сводка под чипами журнала: «2026 год · 8 записей · 88 500 ₽»; при фильтре или поиске — без
 * года: «2 записи · 17 400 ₽». Записи за несколько лет — «2025–2026».
 */
export function describeJournalSummary(entries: SummaryEntry[], filtered: boolean): string {
  const total = entries.reduce((sum, entry) => sum + (entry.cost ?? 0), 0)
  const parts = [`${entries.length} ${pluralize(entries.length, ENTRY_FORMS)}`, formatMoney(total)]
  if (!filtered) parts.unshift(describeYears(entries))
  return parts.join(' · ')
}

function describeYears(entries: SummaryEntry[]): string {
  const years = entries.map((entry) => Number(entry.date.slice(0, 4)))
  const first = Math.min(...years)
  const last = Math.max(...years)
  return first === last ? `${first} год` : `${first}–${last}`
}
