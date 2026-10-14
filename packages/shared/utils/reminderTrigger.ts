import type { ReminderTriggerType } from '../schemas/reminder'

export interface ReminderTriggerSource {
  intervalKm?: number | null
  intervalMonths?: number | null
  nextDueDate?: string | null
  nextDueMileage?: number | null
}

/**
 * Тип срабатывания по заданным условиям: интервалы (или явные сроки, если интервала нет).
 * Оба условия — `both`; ни одного — `date` (запасное значение для колонки NOT NULL).
 */
export function deriveTriggerType(source: ReminderTriggerSource): ReminderTriggerType {
  const hasDate = Boolean(source.intervalMonths) || Boolean(source.nextDueDate)
  const hasMileage = Boolean(source.intervalKm) || source.nextDueMileage != null
  if (hasDate && hasMileage) return 'both'
  if (hasMileage) return 'mileage'
  return 'date'
}
