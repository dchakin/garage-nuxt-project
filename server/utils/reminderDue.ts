import type { ReminderTriggerType } from '~~/shared/schemas/reminder'

interface LastEntryLike {
  date: string
  mileage: number | null
}

interface ComputeNextDueInput {
  triggerType: ReminderTriggerType
  intervalMonths?: number | null
  intervalKm?: number | null
  lastEntry?: LastEntryLike | null
  nextDueDateOverride?: string | null
  nextDueMileageOverride?: number | null
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/**
 * Считает следующую дату/пробег срабатывания напоминания.
 * Если есть привязанная запись (lastEntry) и задан интервал — считаем от неё,
 * иначе используем то, что явно указал пользователь.
 */
export function computeNextDue(input: ComputeNextDueInput): { nextDueDate: string | null; nextDueMileage: number | null } {
  const wantsDate = input.triggerType === 'date' || input.triggerType === 'both'
  const wantsMileage = input.triggerType === 'mileage' || input.triggerType === 'both'

  let nextDueDate: string | null = null
  if (wantsDate) {
    if (input.intervalMonths && input.lastEntry?.date) {
      nextDueDate = addMonths(input.lastEntry.date, input.intervalMonths)
    } else {
      nextDueDate = input.nextDueDateOverride ?? null
    }
  }

  let nextDueMileage: number | null = null
  if (wantsMileage) {
    if (input.intervalKm && input.lastEntry?.mileage != null) {
      nextDueMileage = input.lastEntry.mileage + input.intervalKm
    } else {
      nextDueMileage = input.nextDueMileageOverride ?? null
    }
  }

  return { nextDueDate, nextDueMileage }
}
