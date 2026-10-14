import { db, schema } from '../../database'
import { count, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))

  const { car, role } = await requireCarAccess(carId, user.id)

  const members = await db.query.carMembers.findMany({
    where: eq(schema.carMembers.carId, carId),
    with: { user: true },
  })

  const owner = await db.query.users.findFirst({ where: eq(schema.users.id, car.ownerId) })
  const [{ entriesCount }] = await db
    .select({ entriesCount: count() })
    .from(schema.entries)
    .where(eq(schema.entries.carId, carId))
  const [{ remindersCount }] = await db
    .select({ remindersCount: count() })
    .from(schema.reminders)
    .where(eq(schema.reminders.carId, carId))

  return {
    ...car,
    role,
    ownerName: owner?.name ?? '',
    entriesCount,
    remindersCount,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      user: { id: m.user.id, email: m.user.email, name: m.user.name },
    })),
  }
})
