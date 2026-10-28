import { z } from 'zod'

/** Порядок — как в макете (ТО, Ремонт, Замена, Покупка, Прочее): по нему строятся чипы и плитки типа */
export const entryTypes = ['maintenance', 'repair', 'replacement', 'purchase', 'other'] as const
export type EntryType = (typeof entryTypes)[number]

export const entryTypeLabels: Record<EntryType, string> = {
  repair: 'Ремонт',
  replacement: 'Замена расходника',
  purchase: 'Покупка',
  maintenance: 'Плановое ТО',
  other: 'Прочее',
}

/** Короткие подписи — плитки выбора типа и фильтры (design/garage.pen, «05 · Компоненты»). */
export const entryTypeShortLabels: Record<EntryType, string> = {
  repair: 'Ремонт',
  replacement: 'Замена',
  purchase: 'Покупка',
  maintenance: 'ТО',
  other: 'Прочее',
}

export const entrySchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  type: z.enum(entryTypes),
  categoryId: z.number().int().nullish(),
  description: z.string().default(''),
  mileage: z.number().int().min(0).nullish(),
  cost: z.number().min(0).nullish(),
  currency: z.string().default('RUB'),
  place: z.string().nullish(),
  /** Напоминание той же машины, которое закрывает запись. */
  reminderId: z.number().int().positive().optional(),
})
export type EntryInput = z.infer<typeof entrySchema>

export const entryFilterSchema = z.object({
  type: z.enum(entryTypes).optional(),
  categoryId: z.coerce.number().int().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'mileage']).default('date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})
export type EntryFilterInput = z.infer<typeof entryFilterSchema>
