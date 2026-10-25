import { z } from 'zod'
import { normalizePlateNumber } from '../utils/plate'

export const carSchema = z.object({
  brand: z.string().min(1, 'Укажите марку'),
  model: z.string().min(1, 'Укажите модель'),
  year: z.number().int().min(1900).max(2100).nullish(),
  plateNumber: z.string().transform(normalizePlateNumber).nullish(),
  vin: z.string().nullish(),
  currentMileage: z.number().int().min(0).default(0),
  photoUrl: z.string().url().nullish().or(z.literal('')),
})
export type CarInput = z.infer<typeof carSchema>

export const carUpdateSchema = carSchema.omit({ currentMileage: true }).partial()
export type CarUpdateInput = z.infer<typeof carUpdateSchema>

export const MAX_MILEAGE_KM = 9_999_999

export const carMileageSchema = z.object({
  mileage: z.number().int().min(0).max(MAX_MILEAGE_KM),
  confirmDecrease: z.boolean().optional(),
})
export type CarMileageInput = z.infer<typeof carMileageSchema>

export const inviteSchema = z.object({
  email: z.string().email('Некорректный email'),
})
export type InviteInput = z.infer<typeof inviteSchema>
