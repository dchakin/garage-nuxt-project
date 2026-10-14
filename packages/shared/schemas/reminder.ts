import { z } from 'zod'

export const reminderTriggerTypes = ['date', 'mileage', 'both'] as const
export type ReminderTriggerType = (typeof reminderTriggerTypes)[number]

export const reminderTriggerTypeLabels: Record<ReminderTriggerType, string> = {
  date: 'По дате',
  mileage: 'По пробегу',
  both: 'По дате или пробегу',
}

// Базовая форма без кросс-полевой валидации — нужна отдельно, чтобы можно было
// вызвать .partial() для PATCH (partial() не работает после superRefine/effects).
export const reminderBaseSchema = z.object({
  title: z.string().min(1, 'Укажите название'),
  categoryId: z.number().int().nullish(),
  intervalMonths: z.number().int().min(1).nullish(),
  intervalKm: z.number().int().min(1).nullish(),
  lastEntryId: z.number().int().nullish(),
  nextDueDate: z.string().nullish(),
  nextDueMileage: z.number().int().min(0).nullish(),
  isActive: z.boolean().default(true),
})

function validateTrigger(data: z.infer<typeof reminderBaseSchema>, ctx: z.RefinementCtx) {
  const hasCondition =
    Boolean(data.intervalMonths) ||
    Boolean(data.nextDueDate) ||
    Boolean(data.intervalKm) ||
    data.nextDueMileage != null

  if (!hasCondition) {
    ctx.addIssue({
      code: 'custom',
      message: 'Укажите интервал или срок по дате либо пробегу',
      path: ['intervalMonths'],
    })
  }
}

export const reminderSchema = reminderBaseSchema.superRefine(validateTrigger)
export type ReminderInput = z.infer<typeof reminderBaseSchema>

export const MAX_BULK_REMINDERS = 50

export const reminderBulkItemSchema = z
  .object({
    title: z.string().min(1, 'Укажите название'),
    categoryId: z.number().int().nullish(),
    intervalMonths: z.number().int().min(1).nullish(),
    intervalKm: z.number().int().min(1).nullish(),
    last: z
      .object({
        date: z.string().nullish(),
        mileage: z.number().int().min(0).nullish(),
      })
      .nullish(),
    nextDueDate: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    if (!data.intervalMonths && !data.intervalKm && !data.nextDueDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Укажите интервал или срок по дате',
        path: ['intervalMonths'],
      })
    }
  })

export const reminderBulkSchema = z.object({
  reminders: z.array(reminderBulkItemSchema).min(1).max(MAX_BULK_REMINDERS),
})
export type ReminderBulkInput = z.infer<typeof reminderBulkSchema>

export const reminderFilterSchema = z.object({
  isActive: z.coerce.boolean().optional(),
})
export type ReminderFilterInput = z.infer<typeof reminderFilterSchema>
