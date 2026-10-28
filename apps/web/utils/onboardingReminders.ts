import type { ReminderBulkInput } from '@garage/shared/schemas/reminder'
import { todayIso } from '@garage/shared/utils/format'
import { formatReminderInterval } from '@garage/shared/utils/reminderRemaining'
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

/** Шаблон сезонной смены шин: срок — ближайший сезон, а не «через интервал» */
export const TIRES_TEMPLATE_ID: ReminderTemplateId = 'tires'

/** Месяцы смены шин (номер месяца → «в апреле») */
const TIRE_SWAP_MONTHS = [
  { month: 4, label: 'апреле' },
  { month: 11, label: 'ноябре' },
] as const

const INTERVAL_PREFIX = 'Каждые '

export function countEnabledDrafts(drafts: TemplateDrafts): number {
  return reminderTemplates.filter((template) => drafts[template.id].enabled).length
}

/**
 * Ближайшая смена шин от `today`: текущий месяц смены считается ближайшим (срок — сегодня),
 * иначе первое число следующего месяца смены. `monthLabel` — в предложном падеже («в ноябре»).
 */
export function nextTireSwap(today: string): { date: string; monthLabel: string } {
  const [year, month] = today.split('-').map(Number)
  const upcoming = TIRE_SWAP_MONTHS.find((swap) => swap.month >= month)
  const swap = upcoming ?? TIRE_SWAP_MONTHS[0]
  if (swap.month === month) return { date: today, monthLabel: swap.label }
  const swapYear = upcoming ? year : year + 1
  return {
    date: `${swapYear}-${String(swap.month).padStart(2, '0')}-01`,
    monthLabel: swap.label,
  }
}

/**
 * Подпись под названием шаблона на шаге «Что напоминать»: у включённого шаблона без «когда меняли» —
 * «10 000 км или 12 мес · от сегодня», у шин — сезон, иначе правило «Каждые 12 мес».
 */
export function describeTemplateRule(
  template: ReminderTemplate,
  draft: TemplateDraft,
  today: string,
): string {
  if (template.id === TIRES_TEMPLATE_ID) {
    return `Весной и осенью · ближайшая в ${nextTireSwap(today).monthLabel}`
  }
  const rule = formatReminderInterval(template)
  const countsFromToday =
    draft.enabled &&
    template.id !== POLICY_TEMPLATE_ID &&
    !draft.lastDate &&
    draft.lastMileage == null
  return countsFromToday ? `${rule.replace(INTERVAL_PREFIX, '')} · от сегодня` : rule
}

/**
 * Тело `POST /api/cars/[id]/reminders/bulk` по включённым шаблонам. `categoryIdByName` — категории
 * машины (шаблон ищет свою по имени). Срок ОСАГО — дата «действует до» как есть, шин — ближайший
 * сезон смены, остальным сервер считает срок от «последнего раза» (пусто — от сегодняшнего дня
 * и текущего пробега).
 */
export function buildOnboardingReminders(
  drafts: TemplateDrafts,
  categoryIdByName: ReadonlyMap<string, number>,
  today: string = todayIso(),
): ReminderBulkInput['reminders'] {
  return reminderTemplates
    .filter((template) => drafts[template.id].enabled)
    .map((template) => buildReminderItem(template, drafts[template.id], categoryIdByName, today))
}

function buildReminderItem(
  template: ReminderTemplate,
  draft: TemplateDraft,
  categoryIdByName: ReadonlyMap<string, number>,
  today: string,
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
  if (template.id === TIRES_TEMPLATE_ID) {
    item.nextDueDate = nextTireSwap(today).date
    return item
  }
  if (draft.lastDate || draft.lastMileage != null) {
    item.last = { date: draft.lastDate || null, mileage: draft.lastMileage }
  }
  return item
}
