import { db, schema } from '../../database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const carId = Number(getRouterParam(event, 'id'))

  const { car, role } = await requireCarAccess(carId, user.id)

  const members = await db.query.carMembers.findMany({
    where: eq(schema.carMembers.carId, carId),
    with: { user: true }
  })

  return {
    ...car,
    role,
    members: members.map((m) => ({ id: m.id, role: m.role, user: { id: m.user.id, email: m.user.email, name: m.user.name } }))
  }
})
