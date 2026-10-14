import { z } from 'zod'

export const analyticsPeriods = ['month', 'year', 'all'] as const
export type AnalyticsPeriod = (typeof analyticsPeriods)[number]

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR_PATTERN = /^\d{4}$/

export const analyticsQuerySchema = z
  .object({
    period: z.enum(analyticsPeriods).default('year'),
    /** `YYYY-MM` для month, `YYYY` для year; без даты — текущий период */
    date: z.string().optional(),
  })
  .refine(
    ({ period, date }) =>
      date === undefined ||
      period === 'all' ||
      (period === 'month' ? MONTH_PATTERN.test(date) : YEAR_PATTERN.test(date)),
    { message: 'Неверный формат даты периода', path: ['date'] },
  )
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
