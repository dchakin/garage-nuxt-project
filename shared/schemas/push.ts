import { z } from 'zod'

// Форма PushSubscription.toJSON() из браузера
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url()
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>

// То, что сервер кладёт в push-сообщение и что читает service worker
export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}
