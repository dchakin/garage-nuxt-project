import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { carSchema } from '~~/shared/schemas/car'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, carSchema.partial().parse)

  const { car, role } = await requireCarAccess(carId, user.id)
  if (role !== 'owner') {
    throw createError({ statusCode: 403, statusMessage: 'Редактировать автомобиль может только владелец' })
  }

  const [updated] = await db
    .update(schema.cars)
    .set({
      ...(body.brand !== undefined && { brand: body.brand }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.year !== undefined && { year: body.year }),
      ...(body.plateNumber !== undefined && { plateNumber: body.plateNumber }),
      ...(body.vin !== undefined && { vin: body.vin }),
      ...(body.currentMileage !== undefined && { currentMileage: body.currentMileage }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl || null })
    })
    .where(eq(schema.cars.id, carId))
    .returning()

  return updated ?? car
})
