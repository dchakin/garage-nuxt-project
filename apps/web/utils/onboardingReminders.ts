import type { ReminderBulkInput } from '@garage/shared/schemas/reminder'
import {
  reminderTemplates,
  type ReminderTemplate,
  type ReminderTemplateId,
} from '@garage/shared/utils/reminderTemplates'

/** Шаблон, у которого вместо «когда меняли» спрашиваем дату окончания («Полис действует до») */
export const POLICY_TEMPLATE_ID: ReminderTemplateId = 'osago'

/** Шаблоны, включённые в мастере по умолчанию */
export const DEFAULT_ONBOARDING_TEMPLATE_IDS: readonly ReminderTemplateId[] = [
  'oil',
  'osago',
  'inspection',
]

/** Выбор пользователя по одному шаблону на шаге «Что напоминать» */
export interface TemplateDraft {
  enabled: boolean
  /** «Указать, когда меняли»: дата и пробег последнего раза (для ОСАГО — не используются) */
  lastDate: string
  lastMileage: number | null
  /** ОСАГО: «Полис действует до» */
  validUntil: string
}

export type TemplateDrafts = Record<ReminderTemplateId, TemplateDraft>

export function createTemplateDrafts(): TemplateDrafts {
  return Object.fromEntries(
    reminderTemplates.map((template) => [
      template.id,
      {
        enabled: DEFAULT_ONBOARDING_TEMPLATE_IDS.includes(template.id),
        lastDate: '',
        lastMileage: null,
        validUntil: '',
      },
    ]),
  ) as TemplateDrafts
}

export function countEnabledDrafts(drafts: TemplateDrafts): number {
  return reminderTemplates.filter((template) => drafts[template.id].enabled).length
}

/**
 * Тело `POST /api/cars/[id]/reminders/bulk` по включённым шаблонам. `categoryIdByName` — категории
 * машины (шаблон ищет свою по имени). Срок ОСАГО — дата «действует до» как есть, остальным сервер
 * считает срок от «последнего раза» (пусто — от сегодняшнего дня и текущего пробега).
 */
export function buildOnboardingReminders(
  drafts: TemplateDrafts,
  categoryIdByName: ReadonlyMap<string, number>,
): ReminderBulkInput['reminders'] {
  return reminderTemplates
    .filter((template) => drafts[template.id].enabled)
    .map((template) => buildReminderItem(template, drafts[template.id], categoryIdByName))
}

function buildReminderItem(
  template: ReminderTemplate,
  draft: TemplateDraft,
  categoryIdByName: ReadonlyMap<string, number>,
): ReminderBulkInput['reminders'][number] {
  const item: ReminderBulkInput['reminders'][number] = {
    title: template.title,
    intervalKm: template.intervalKm,
    intervalMonths: template.intervalMonths,
    categoryId: template.categoryName
      ? (categoryIdByName.get(template.categoryName) ?? null)
      : null,
  }
  if (template.id === POLICY_TEMPLATE_ID) {
    if (draft.validUntil) item.nextDueDate = draft.validUntil
    return item
  }
  if (draft.lastDate || draft.lastMileage != null) {
    item.last = { date: draft.lastDate || null, mileage: draft.lastMileage }
  }
  return item
}
