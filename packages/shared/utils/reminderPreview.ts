import { computeNextDue } from './reminderDue'
import { getReminderStatus } from './reminderStatus'
import { deriveTriggerType } from './reminderTrigger'

export interface ReminderPreviewInput {
  intervalKm: number | null
  intervalMonths: number | null
  /** «Последний раз»: пустая дата — сегодня, пустой пробег — текущий пробег машины (как на сервере) */
  last: { date: string | null; mileage: number | null }
  currentMileage: number
  today: string
}

export interface ReminderPreview {
  nextDueDate: string | null
  nextDueMileage: number | null
  /** Рассчитанный срок уже позади — форма предупреждает «Срок уже прошёл» */
  isOverdue: boolean
}

/**
 * Срок нового напоминания от «последнего раза» — те же правила, что у
 * `POST /api/cars/[id]/reminders/bulk` (`computeNextDue`). `null`, пока интервалов нет.
 */
export function previewReminderDue(input: ReminderPreviewInput): ReminderPreview | null {
  if (!input.intervalKm && !input.intervalMonths) return null
  const { nextDueDate, nextDueMileage } = computeNextDue({
    triggerType: deriveTriggerType(input),
    intervalKm: input.intervalKm,
    intervalMonths: input.intervalMonths,
    lastEntry: {
      date: input.last.date || input.today,
      mileage: input.last.mileage ?? input.currentMileage,
    },
  })
  const status = getReminderStatus(
    { isActive: true, nextDueDate, nextDueMileage, intervalKm: input.intervalKm },
    input.currentMileage,
    input.today,
  )
  return { nextDueDate, nextDueMileage, isOverdue: status === 'overdue' }
}
