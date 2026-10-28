import { formatDays, todayIso } from '@garage/shared/utils/format'
import { daysUntil } from '@garage/shared/utils/reminderStatus'

/**
 * «3 дня назад» / «вчера» / «только что» — возраст пробега по календарным дням в часовом поясе
 * устройства. `updatedAt` — момент из `Car.mileageUpdatedAt` (ISO); `null` — пробег ни разу
 * не обновлялся, подпись не нужна.
 */
export function formatMileageAgePhrase(
  updatedAt: string | null,
  today: string = todayIso(),
): string | null {
  if (!updatedAt) return null
  const days = -daysUntil(todayIso(new Date(updatedAt)), today)
  if (days <= 0) return 'только что'
  if (days === 1) return 'вчера'
  return `${formatDays(days)} назад`
}

/** «обновлён 3 дня назад» под пробегом на Обзоре (в шторке Б5 — «обновлено …») */
export function formatMileageAge(
  updatedAt: string | null,
  today: string = todayIso(),
): string | null {
  const phrase = formatMileageAgePhrase(updatedAt, today)
  return phrase && `обновлён ${phrase}`
}
