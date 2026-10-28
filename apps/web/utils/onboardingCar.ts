import type { CarInput } from '@garage/shared/schemas/car'

export const MIN_CAR_YEAR = 1900
export const MAX_CAR_YEAR = 2100

/** Значения формы «Ваша машина» (А4); год хранится строкой, пока пользователь печатает */
export interface CarStepValues {
  brand: string
  model: string
  year: string
  plateNumber: string
  currentMileage: number | null
}

export function createCarStepValues(): CarStepValues {
  return { brand: '', model: '', year: '', plateNumber: '', currentMileage: null }
}

/** Год выпуска: пусто — не указан (`null`), число вне диапазона или не число — `NaN` */
export function parseCarYear(year: string): number | null {
  const trimmed = year.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  const isValid = Number.isInteger(parsed) && parsed >= MIN_CAR_YEAR && parsed <= MAX_CAR_YEAR
  return isValid ? parsed : Number.NaN
}

/** Тело `POST /api/cars` из формы; вызывать после проверки обязательных полей */
export function buildCarInput(values: CarStepValues): CarInput {
  const year = parseCarYear(values.year)
  const plateNumber = values.plateNumber.trim()
  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: Number.isNaN(year) ? null : year,
    plateNumber: plateNumber || null,
    currentMileage: values.currentMileage ?? 0,
  }
}
