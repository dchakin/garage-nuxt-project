import { formatDays, todayIso } from '@garage/shared/utils/format'
import { daysUntil } from '@garage/shared/utils/reminderStatus'

/**
 * «обновлён 3 дня назад» под пробегом на Обзоре. `updatedAt` — момент из `Car.mileageUpdatedAt`
 * (ISO); считаем по календарным дням в часовом поясе устройства. `null` — пробег ни разу
 * не обновлялся, подпись не нужна.
 */
export function formatMileageAge(
  updatedAt: string | null,
  today: string = todayIso(),
): string | null {
  if (!updatedAt) return null
  const days = -daysUntil(todayIso(new Date(updatedAt)), today)
  if (days <= 0) return 'обновлён сегодня'
  if (days === 1) return 'обновлён вчера'
  return `обновлён ${formatDays(days)} назад`
}
