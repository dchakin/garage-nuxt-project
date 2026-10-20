import type { Entry, Reminder } from '../types'

export type ReminderTemplateId = 'oil' | 'osago' | 'inspection' | 'timing-belt' | 'tires'

/** Выбор «Своё напоминание» (Е2) среди шаблонов */
export const CUSTOM_REMINDER_CHOICE = 'custom'
export type ReminderTemplateChoice = ReminderTemplateId | typeof CUSTOM_REMINDER_CHOICE

export interface ReminderTemplate {
  id: ReminderTemplateId
  title: string
  intervalKm: number | null
  intervalMonths: number | null
  /**
   * Имя стандартной категории (сид): категорию машины ищем по имени, ссылки на id нет.
   * `null` — без категории: общая «Прочее» подставила бы в «Последний раз» чужую запись.
   */
  categoryName: string | null
}

/** Готовые напоминания для формы Е1: «каждые N км или M мес» */
export const reminderTemplates: readonly ReminderTemplate[] = [
  {
    id: 'oil',
    title: 'Замена масла',
    intervalKm: 10_000,
    intervalMonths: 12,
    categoryName: 'Масло и фильтры',
  },
  { id: 'osago', title: 'ОСАГО', intervalKm: null, intervalMonths: 12, categoryName: null },
  {
    id: 'inspection',
    title: 'Техосмотр',
    intervalKm: null,
    intervalMonths: 12,
    categoryName: null,
  },
  {
    id: 'timing-belt',
    title: 'Замена ГРМ',
    intervalKm: 60_000,
    intervalMonths: 60,
    categoryName: 'Двигатель',
  },
  {
    id: 'tires',
    title: 'Сезонная смена шин',
    intervalKm: null,
    intervalMonths: 6,
    categoryName: 'Шины',
  },
]

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Напоминание с таким же названием (без учёта регистра и лишних пробелов) — для Е3 «уже есть» */
export function findReminderByTitle<T extends Pick<Reminder, 'title'>>(
  reminders: readonly T[],
  title: string,
): T | undefined {
  const wanted = normalizeTitle(title)
  if (!wanted) return undefined
  return reminders.find((reminder) => normalizeTitle(reminder.title) === wanted)
}

/**
 * Самая свежая запись журнала с той же категорией — из неё подставляется «Последний раз».
 * Записи без категории и поиск «без категории» не совпадают.
 */
export function findLastEntryInCategory<T extends Pick<Entry, 'id' | 'date' | 'categoryId'>>(
  entries: readonly T[],
  categoryId: number | null,
): T | undefined {
  if (categoryId == null) return undefined
  return entries
    .filter((entry) => entry.categoryId === categoryId)
    .reduce<T | undefined>(
      (latest, entry) =>
        !latest || entry.date > latest.date || (entry.date === latest.date && entry.id > latest.id)
          ? entry
          : latest,
      undefined,
    )
}
