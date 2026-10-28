import { db, schema } from '../../database'
import { carSchema } from '@garage/shared/schemas/car'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const body = await readValidatedBody(event, carSchema.parse)

  const [car] = await db
    .insert(schema.cars)
    .values({
      ownerId: user.id,
      brand: body.brand,
      model: body.model,
      year: body.year ?? null,
      plateNumber: body.plateNumber ?? null,
      vin: body.vin ?? null,
      currentMileage: body.currentMileage,
      // Пробег только что ввели — «обновлён только что» на Обзоре (А6)
      mileageUpdatedAt: new Date(),
      photoUrl: body.photoUrl || null,
    })
    .returning()

  return car
})
