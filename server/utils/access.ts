import { and, eq } from 'drizzle-orm'
import { db, schema } from '../database'

/**
 * Проверяет, что пользователь — владелец или участник автомобиля.
 * Бросает 403/404, если доступа нет или авто не существует.
 */
export async function requireCarAccess(carId: number, userId: number) {
  const car = await db.query.cars.findFirst({
    where: eq(schema.cars.id, carId)
  })

  if (!car) {
    throw createError({ statusCode: 404, statusMessage: 'Автомобиль не найден' })
  }

  if (car.ownerId === userId) {
    return { car, role: 'owner' as const }
  }

  const member = await db.query.carMembers.findFirst({
    where: and(eq(schema.carMembers.carId, carId), eq(schema.carMembers.userId, userId))
  })

  if (!member) {
    throw createError({ statusCode: 403, statusMessage: 'Нет доступа к этому автомобилю' })
  }

  return { car, role: member.role }
}
