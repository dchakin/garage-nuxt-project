import type { Entry } from '../types'
import { formatDate, formatMileage } from './format'

type MileageCheckEntry = Pick<Entry, 'date' | 'mileage'> & { id?: number }

export type EntryMileageCheck =
  { level: 'ok' } | { level: 'error'; message: string } | { level: 'warning'; message: string }

export interface EntryMileageCheckInput {
  /** Введённый пробег; пусто — проверять нечего. */
  mileage: number | null | undefined
  /** Дата записи, `YYYY-MM-DD`. */
  date: string
  /** Сегодня, `YYYY-MM-DD`. */
  today: string
  /** Текущий пробег машины. */
  currentMileage: number
  /** Записи машины; записи без пробега и с той же датой в сверке не участвуют. */
  entries: MileageCheckEntry[]
  /** Правка существующей записи: её саму с соседями не сравниваем. */
  editingEntryId?: number
  /** Сохранённые пробег и дата правимой записи: не менялись — правило не применяется. */
  original?: { mileage: number | null; date: string }
}

/**
 * Правило пробега для записи (Д3). Дата «сегодня» (или позже) и пробег меньше текущего —
 * `error` (опечатка, сохранять нельзя). Дата в прошлом — пробег сверяется с ближайшими по дате
 * записями: меньше пробега предыдущей или больше пробега следующей — `warning`.
 * При правке (`original`) нетронутые пробег и дата не проверяются: можно поменять, например, цену.
 */
export function checkEntryMileage(input: EntryMileageCheckInput): EntryMileageCheck {
  const { mileage, date, today, currentMileage, original } = input
  if (mileage == null) return { level: 'ok' }
  if (original && original.mileage === mileage && original.date === date) return { level: 'ok' }

  if (date >= today) {
    if (mileage < currentMileage) {
      return {
        level: 'error',
        message: `Меньше текущего пробега (${formatMileage(currentMileage)}). Похоже на опечатку — проверьте число. Для старой записи сначала смените дату.`,
      }
    }
    return { level: 'ok' }
  }

  return checkAgainstNeighbours(input, mileage)
}

function checkAgainstNeighbours(input: EntryMileageCheckInput, mileage: number): EntryMileageCheck {
  const { date, today, entries, editingEntryId } = input
  const withMileage = entries.filter(
    (entry): entry is MileageCheckEntry & { mileage: number } =>
      entry.mileage != null &&
      entry.date !== date &&
      (editingEntryId === undefined || entry.id !== editingEntryId),
  )

  const previous = nearestByDate(
    withMileage.filter((entry) => entry.date < date),
    'latest',
  )
  if (previous && mileage < previous.mileage) {
    return {
      level: 'warning',
      message: `Меньше, чем в записи от ${formatDate(previous.date, today)} (${formatMileage(previous.mileage)}). Проверьте число.`,
    }
  }

  const next = nearestByDate(
    withMileage.filter((entry) => entry.date > date),
    'earliest',
  )
  if (next && mileage > next.mileage) {
    return {
      level: 'warning',
      message: `Больше, чем в записи от ${formatDate(next.date, today)} (${formatMileage(next.mileage)}). Проверьте число.`,
    }
  }

  return { level: 'ok' }
}

/**
 * Ближайшая запись по дате; при нескольких записях в один день берётся самая строгая для
 * проверки: у предыдущей — наибольший пробег, у следующей — наименьший.
 */
function nearestByDate(
  entries: (MileageCheckEntry & { mileage: number })[],
  side: 'latest' | 'earliest',
): (MileageCheckEntry & { mileage: number }) | null {
  let nearest: (MileageCheckEntry & { mileage: number }) | null = null
  for (const entry of entries) {
    if (!nearest) {
      nearest = entry
      continue
    }
    if (entry.date === nearest.date) {
      const isStricter =
        side === 'latest' ? entry.mileage > nearest.mileage : entry.mileage < nearest.mileage
      if (isStricter) nearest = entry
    } else if (side === 'latest' ? entry.date > nearest.date : entry.date < nearest.date) {
      nearest = entry
    }
  }
  return nearest
}
