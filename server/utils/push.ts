import webpush from 'web-push'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../database'
import { getReminderStatus } from '~~/shared/utils/reminderStatus'
import type { PushPayload } from '~~/shared/schemas/push'

let configured: boolean | null = null

/** Настраивает VAPID один раз. Возвращает false, если ключи не заданы — тогда push просто выключен. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const config = useRuntimeConfig()
  const publicKey = config.public.vapidPublicKey
  const privateKey = config.vapidPrivateKey
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID-ключи не заданы — push-уведомления отключены')
    configured = false
    return false
  }
  webpush.setVapidDetails(String(config.vapidSubject), String(publicKey), String(privateKey))
  configured = true
  return true
}

/**
 * Отправляет уведомление на все устройства пользователя.
 * Протухшие подписки (404/410 от push-сервиса) удаляются. Возвращает число доставленных.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(schema.pushSubscriptions.userId, userId)
  })

  let delivered = 0
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 }
      )
      delivered++
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id))
      } else {
        console.error('[push] не удалось отправить уведомление', e?.statusCode, e?.body || e?.message)
      }
    }
  }))
  return delivered
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function formatKm(km: number) {
  return `${km.toLocaleString('ru-RU')} км`
}

/**
 * Проверяет активные напоминания (всех авто или одного) и шлёт push о тех,
 * что перешли в статус «скоро» или «просрочено». Каждое сочетание
 * напоминание+пользователь+статус+срок уведомляется один раз.
 */
export async function notifyDueReminders(options: { carId?: number } = {}) {
  if (!ensureConfigured()) return { checked: 0, sent: 0 }

  const conditions = [eq(schema.reminders.isActive, true)]
  if (options.carId) conditions.push(eq(schema.reminders.carId, options.carId))

  const list = await db.query.reminders.findMany({
    where: and(...conditions),
    with: { car: { with: { members: true } } }
  })

  // Уведомляем только тех, у кого есть хоть одна подписка
  const subscribed = new Set(
    (await db.selectDistinct({ userId: schema.pushSubscriptions.userId }).from(schema.pushSubscriptions))
      .map((r) => r.userId)
  )

  let sent = 0
  for (const reminder of list) {
    const status = getReminderStatus(reminder, reminder.car.currentMileage)
    if (status !== 'soon' && status !== 'overdue') continue

    const recipients = [...new Set([reminder.car.ownerId, ...reminder.car.members.map((m) => m.userId)])]
      .filter((id) => subscribed.has(id))
    if (!recipients.length) continue

    const dueKey = `${reminder.nextDueDate ?? ''}|${reminder.nextDueMileage ?? ''}`
    const car = reminder.car
    const due = [
      reminder.nextDueDate && `до ${formatDate(reminder.nextDueDate)}`,
      reminder.nextDueMileage != null && `на ${formatKm(reminder.nextDueMileage)} (сейчас ${formatKm(car.currentMileage)})`
    ].filter(Boolean).join(' или ')

    const payload: PushPayload = {
      title: `${status === 'overdue' ? '⚠️ Просрочено' : '🔧 Скоро'}: ${reminder.title}`,
      body: `${car.brand} ${car.model}${due ? ` — ${due}` : ''}`,
      url: `/cars/${car.id}?tab=reminders`,
      tag: `reminder-${reminder.id}`
    }

    for (const userId of recipients) {
      // Сначала «бронируем» запись в журнале: unique-индекс не даст отправить дубль,
      // даже если ежедневная задача и проверка после новой записи пересеклись.
      const [logged] = await db
        .insert(schema.reminderNotifications)
        .values({ reminderId: reminder.id, userId, status, dueKey })
        .onConflictDoNothing()
        .returning()
      if (!logged) continue

      const delivered = await sendPushToUser(userId, payload)
      if (delivered) {
        sent++
      } else {
        // Не доставили ни на одно устройство — пробуем снова при следующей проверке
        await db.delete(schema.reminderNotifications).where(eq(schema.reminderNotifications.id, logged.id))
      }
    }
  }

  return { checked: list.length, sent }
}
