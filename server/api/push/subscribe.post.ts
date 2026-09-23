import { db, schema } from '../../database'
import { pushSubscriptionSchema } from '~~/shared/schemas/push'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readValidatedBody(event, pushSubscriptionSchema.parse)

  // endpoint уникален: если браузер уже был подписан (в т.ч. под другим аккаунтом) — перепривязываем
  await db
    .insert(schema.pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: getRequestHeader(event, 'user-agent') ?? null
    })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: body.keys.p256dh, auth: body.keys.auth }
    })

  return { ok: true }
})
