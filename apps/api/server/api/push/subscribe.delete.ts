import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../database'
import { pushUnsubscribeSchema } from '@garage/shared/schemas/push'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const body = await readValidatedBody(event, pushUnsubscribeSchema.parse)

  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, user.id),
        eq(schema.pushSubscriptions.endpoint, body.endpoint),
      ),
    )

  return { ok: true }
})
