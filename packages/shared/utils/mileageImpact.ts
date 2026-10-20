import type { Reminder, ReminderStatus } from '../types'
import { formatMileage } from './format'
import { getReminderStatus } from './reminderStatus'

type ImpactReminder = Pick<
  Reminder,
  'id' | 'title' | 'isActive' | 'nextDueDate' | 'nextDueMileage' | 'intervalKm'
>

/** Что случится с одним напоминанием, если пробег станет `after` вместо `before`. */
export interface ReminderMileageChange<T extends ImpactReminder = ImpactReminder> {
  reminder: T
  statusBefore: ReminderStatus
  statusAfter: ReminderStatus
  /** Остаток по пробегу: положительный — осталось ехать, отрицательный — просрочено на столько */
  kmLeftBefore: number
  kmLeftAfter: number
  /** Статус поднялся до «скоро» или «просрочено» — сервер пришлёт push */
  willPush: boolean
}

export interface MileageImpact<T extends ImpactReminder = ImpactReminder> {
  changes: ReminderMileageChange<T>[]
  /** Хотя бы у одного напоминания статус переходит в «скоро»/«просрочено» */
  willPush: boolean
}

/** «Строгость» статуса: переход вверх по этой шкале в «скоро»/«просрочено» даёт push. */
const STATUS_SEVERITY: Record<ReminderStatus, number> = {
  inactive: 0,
  ok: 1,
  soon: 2,
  overdue: 3,
}

function isPushTransition(before: ReminderStatus, after: ReminderStatus): boolean {
  return (
    (after === 'soon' || after === 'overdue') && STATUS_SEVERITY[after] > STATUS_SEVERITY[before]
  )
}

/**
 * Что изменится у напоминаний при смене пробега с `before` на `after`. В список попадают
 * включённые напоминания с условием по пробегу, у которых меняется статус или остаток
 * «скоро»/«просрочено» (то, что видно в «Требует внимания»); остаток «в порядке» → «в порядке»
 * не новость. По дате и выключенные пробегом не затрагиваются.
 * Статусы считает `getReminderStatus` — та же функция, что у бейджа и карточек.
 */
export function diffReminderStatuses<T extends ImpactReminder>(
  reminders: T[],
  before: number,
  after: number,
  today?: string,
): MileageImpact<T> {
  if (before === after) return { changes: [], willPush: false }

  const changes: ReminderMileageChange<T>[] = []
  for (const reminder of reminders) {
    if (!reminder.isActive || reminder.nextDueMileage == null) continue
    const statusBefore = getReminderStatus(reminder, before, today)
    const statusAfter = getReminderStatus(reminder, after, today)
    if (statusBefore === 'ok' && statusAfter === 'ok') continue
    changes.push({
      reminder,
      statusBefore,
      statusAfter,
      kmLeftBefore: reminder.nextDueMileage - before,
      kmLeftAfter: reminder.nextDueMileage - after,
      willPush: isPushTransition(statusBefore, statusAfter),
    })
  }
  return { changes, willPush: changes.some((change) => change.willPush) }
}

function describeKmLeft(kmLeft: number): string {
  return kmLeft < 0 ? `просрочено на ${formatMileage(-kmLeft)}` : `через ${formatMileage(kmLeft)}`
}

/** Строка блока «Изменится N напоминаний»: «Замена масла: просрочено уже на 712 км, а не на 250 км». */
export function describeMileageChange(change: ReminderMileageChange): string {
  const { reminder, kmLeftBefore, kmLeftAfter } = change
  const bothOverdue = kmLeftBefore < 0 && kmLeftAfter < 0
  if (bothOverdue && kmLeftAfter < kmLeftBefore) {
    return `${reminder.title}: просрочено уже на ${formatMileage(-kmLeftAfter)}, а не на ${formatMileage(-kmLeftBefore)}`
  }
  return `${reminder.title}: ${describeKmLeft(kmLeftAfter)}, было ${describeKmLeft(kmLeftBefore)}`
}
