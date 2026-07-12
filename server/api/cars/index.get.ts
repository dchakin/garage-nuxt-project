import { eq } from 'drizzle-orm'
import { db, schema } from '../../database'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const owned = await db.query.cars.findMany({
    where: eq(schema.cars.ownerId, user.id)
  })

  const memberships = await db.query.carMembers.findMany({
    where: eq(schema.carMembers.userId, user.id),
    with: { car: true }
  })

  const memberCars = memberships.map((m) => m.car).filter(Boolean)

  const allCars = [...owned, ...memberCars.filter((c) => c && c.ownerId !== user.id)]

  return allCars
})
