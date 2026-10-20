import type { Reminder } from '../types'
import { previewReminderDue, type ReminderPreview } from './reminderPreview'

/** Что нужно знать о напоминании, чтобы пересчитать срок при правке (Е4) */
export type ReminderEditSource = Pick<
  Reminder,
  'intervalKm' | 'intervalMonths' | 'nextDueDate' | 'nextDueMileage' | 'lastEntry'
>

export interface ReminderEditValues {
  intervalKm: number | null
  intervalMonths: number | null
  /** «Последний раз»: пустая дата/пробег — сегодня/текущий пробег, как при создании */
  lastDate: string
  lastMileage: number | null
  /** «Последний раз» правили руками — срок считается от введённого, а не от привязанной записи */
  lastTouched: boolean
}

export interface ReminderEditContext {
  currentMileage: number
  today: string
}

/** Поля срока для `PATCH /api/reminders/[id]`; `undefined` — не трогать */
export interface ReminderDuePatch {
  lastEntryId?: null
  nextDueDate?: string | null
  nextDueMileage?: number | null
}

export interface ReminderEditPlan {
  /** Срок, который получится после сохранения; `null` — срока нет */
  due: ReminderPreview | null
  patch: ReminderDuePatch
  /** Есть хотя бы одно условие (интервал или оставшийся срок) — иначе сохранять нельзя */
  valid: boolean
}

/** «Последний раз» для формы: из записи, к которой привязано напоминание, иначе пусто */
export function initialLast(reminder: Pick<Reminder, 'lastEntry'>): {
  date: string
  mileage: number | null
} {
  return {
    date: reminder.lastEntry?.date ?? '',
    mileage: reminder.lastEntry?.mileage ?? null,
  }
}

/**
 * Что будет со сроком при сохранении правки. Сервер считает срок от привязанной записи
 * (`lastEntryId`), если она есть, иначе берёт `nextDue*` как есть, поэтому:
 * - привязанная запись и «Последний раз» не трогали — сервер сам пересчитает по новым интервалам;
 * - «Последний раз» правили (или интервал добавили/изменили у напоминания без записи) — отвязываем
 *   запись и отправляем рассчитанный срок явно (`previewReminderDue`, те же правила, что у bulk);
 * - убрали интервал — обнуляем и соответствующий `nextDue*` (иначе условие останется);
 * - ничего не менялось — срок остаётся прежним.
 */
export function planReminderEdit(
  reminder: ReminderEditSource,
  values: ReminderEditValues,
  context: ReminderEditContext,
): ReminderEditPlan {
  const clearedKm = !!reminder.intervalKm && !values.intervalKm
  const clearedMonths = !!reminder.intervalMonths && !values.intervalMonths
  const hasIntervals = !!values.intervalKm || !!values.intervalMonths
  const intervalsChanged =
    (values.intervalKm || null) !== reminder.intervalKm ||
    (values.intervalMonths || null) !== reminder.intervalMonths
  const explicit = hasIntervals && (values.lastTouched || (!reminder.lastEntry && intervalsChanged))

  const computed = hasIntervals
    ? previewReminderDue({
        intervalKm: values.intervalKm || null,
        intervalMonths: values.intervalMonths || null,
        last: { date: values.lastDate || null, mileage: values.lastMileage },
        ...context,
      })
    : null

  const patch: ReminderDuePatch = {}
  if (explicit) patch.lastEntryId = null
  if (values.intervalKm) {
    if (explicit) patch.nextDueMileage = computed?.nextDueMileage ?? null
  } else if (clearedKm) patch.nextDueMileage = null
  if (values.intervalMonths) {
    if (explicit) patch.nextDueDate = computed?.nextDueDate ?? null
  } else if (clearedMonths) patch.nextDueDate = null

  const useComputed = hasIntervals && (explicit || !!reminder.lastEntry)
  const due: ReminderPreview | null = useComputed
    ? computed
    : {
        nextDueDate: clearedMonths ? null : reminder.nextDueDate,
        nextDueMileage: clearedKm ? null : reminder.nextDueMileage,
        isOverdue: false,
      }
  const hasDue = !!due && (due.nextDueDate != null || due.nextDueMileage != null)
  return { due: hasDue ? due : null, patch, valid: hasIntervals || hasDue }
}
