import { db } from '../../database'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return db.query.categories.findMany({ orderBy: (c, { asc }) => asc(c.name) })
})
