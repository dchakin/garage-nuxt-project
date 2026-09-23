import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const sendNotification = vi.fn().mockResolvedValue(undefined)
const setVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: { sendNotification, setVapidDetails }
}))

;(globalThis as any).useRuntimeConfig = () => ({
  public: { vapidPublicKey: 'test-public-key' },
  vapidPrivateKey: 'test-private-key',
  vapidSubject: 'mailto:test@test.local'
})

let dbFile: string
let db: typeof import('../../server/database').db
let schema: typeof import('../../server/database').schema
let notifyDueReminders: typeof import('../../server/utils/push').notifyDueReminders

let carId: number

beforeAll(async () => {
  dbFile = createTestDbFile()
  process.env.DB_FILE_NAME = dbFile
  ;({ db, schema } = await import('../../server/database'))
  ;({ notifyDueReminders } = await import('../../server/utils/push'))

  const [owner] = await db.insert(schema.users).values({ email: 'owner2@test.local', passwordHash: 'x', name: 'Owner' }).returning()
  const [car] = await db.insert(schema.cars).values({ ownerId: owner.id, brand: 'Lada', model: 'Vesta', currentMileage: 91000 }).returning()
  carId = car.id

  await db.insert(schema.pushSubscriptions).values({
    userId: owner.id,
    endpoint: 'https://push.example.com/1',
    p256dh: 'p256dh-key',
    auth: 'auth-key'
  })

  // Просрочено по пробегу: nextDueMileage < currentMileage авто
  await db.insert(schema.reminders).values({
    carId,
    title: 'Замена масла',
    triggerType: 'mileage',
    intervalKm: 10000,
    nextDueMileage: 90000,
    isActive: true
  })
})

afterAll(() => {
  cleanupTestDbFile(dbFile)
})

describe('notifyDueReminders', () => {
  it('отправляет push один раз и не дублирует при повторном вызове', async () => {
    const first = await notifyDueReminders({ carId })
    expect(first.sent).toBe(1)
    expect(sendNotification).toHaveBeenCalledTimes(1)

    const logsAfterFirst = await db.select().from(schema.reminderNotifications)
    expect(logsAfterFirst).toHaveLength(1)

    // Дедупликация по reminder+user+status+dueKey: срок не изменился, повторной отправки быть не должно
    const second = await notifyDueReminders({ carId })
    expect(second.sent).toBe(0)
    expect(sendNotification).toHaveBeenCalledTimes(1)

    const logsAfterSecond = await db.select().from(schema.reminderNotifications)
    expect(logsAfterSecond).toHaveLength(1)
  })
})
