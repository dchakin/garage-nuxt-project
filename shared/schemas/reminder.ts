import { z } from 'zod'

export const reminderTriggerTypes = ['date', 'mileage', 'both'] as const
export type ReminderTriggerType = (typeof reminderTriggerTypes)[number]

export const reminderTriggerTypeLabels: Record<ReminderTriggerType, string> = {
  date: 'По дате',
  mileage: 'По пробегу',
  both: 'По дате или пробегу'
}

// Базовая форма без кросс-полевой валидации — нужна отдельно, чтобы можно было
// вызвать .partial() для PATCH (partial() не работает после superRefine/effects).
export const reminderBaseSchema = z.object({
  title: z.string().min(1, 'Укажите название'),
  categoryId: z.number().int().nullish(),
  triggerType: z.enum(reminderTriggerTypes),
  intervalMonths: z.number().int().min(1).nullish(),
  intervalKm: z.number().int().min(1).nullish(),
  lastEntryId: z.number().int().nullish(),
  nextDueDate: z.string().nullish(),
  nextDueMileage: z.number().int().min(0).nullish(),
  isActive: z.boolean().default(true)
})

function validateTrigger(data: z.infer<typeof reminderBaseSchema>, ctx: z.RefinementCtx) {
  const needsDate = data.triggerType === 'date' || data.triggerType === 'both'
  const needsMileage = data.triggerType === 'mileage' || data.triggerType === 'both'

  if (needsDate && !data.intervalMonths && !data.nextDueDate) {
    ctx.addIssue({ code: 'custom', message: 'Укажите интервал в месяцах или дату', path: ['intervalMonths'] })
  }
  if (needsMileage && !data.intervalKm && data.nextDueMileage == null) {
    ctx.addIssue({ code: 'custom', message: 'Укажите интервал в км или пробег', path: ['intervalKm'] })
  }
}

export const reminderSchema = reminderBaseSchema.superRefine(validateTrigger)
export type ReminderInput = z.infer<typeof reminderBaseSchema>

export const reminderFilterSchema = z.object({
  isActive: z.coerce.boolean().optional()
})
export type ReminderFilterInput = z.infer<typeof reminderFilterSchema>
