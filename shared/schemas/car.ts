import { z } from 'zod'

export const carSchema = z.object({
  brand: z.string().min(1, 'Укажите марку'),
  model: z.string().min(1, 'Укажите модель'),
  year: z.number().int().min(1900).max(2100).nullish(),
  plateNumber: z.string().nullish(),
  vin: z.string().nullish(),
  currentMileage: z.number().int().min(0).default(0),
  photoUrl: z.string().url().nullish().or(z.literal(''))
})
export type CarInput = z.infer<typeof carSchema>

export const inviteSchema = z.object({
  email: z.string().email('Некорректный email')
})
export type InviteInput = z.infer<typeof inviteSchema>
