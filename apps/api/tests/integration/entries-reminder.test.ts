import Database from 'better-sqlite3'
import { afterAll, describe, expect, it } from 'vitest'
import { getReminderStatus } from '@garage/shared/utils/reminderStatus'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const dbFile = createTestDbFile()

const server = await startApiServer({
  DB_FILE_NAME: dbFile,
  NUXT_SESSION_PASSWORD: 'a'.repeat(32),
  NUXT_SESSION_COOKIE_SECURE: 'false',
})
const { $fetch, fetch } = createHttpClient(server.baseUrl)

afterAll(() => {
  server.stop()
  cleanupTestDbFile(dbFile)
})

async function registerCookie(email: string): Promise<string> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password1', name: 'Тест' }),
    headers: { 'content-type': 'application/json' },
  })
  return res.headers.get('set-cookie')!.split(';')[0]
}

async function createCar(cookie: string, model: string) {
  return $fetch('/api/cars', {
    method: 'POST',
    headers: { cookie },
    body: { brand: 'Toyota', model, currentMileage: 100000 },
  })
}

async function createOverdueReminder(cookie: string, carId: number) {
  return $fetch(`/api/cars/${carId}/reminders`, {
    method: 'POST',
    headers: { cookie },
    body: {
      title: 'Замена масла',
      intervalKm: 10000,
      nextDueMileage: 95000,
    },
  })
}

describe('закрытие напоминания записью', () => {
  it('ставит lastEntryId, пересчитывает срок и сбрасывает уведомления', async () => {
    const cookie = await registerCookie('close@test.local')
    const car = await createCar(cookie, 'Camry')
    const reminder = await createOverdueReminder(cookie, car.id)
    expect(getReminderStatus(reminder, 100000, '2026-10-10')).toBe('overdue')

    const db = new Database(dbFile)
    const userId = (
      db.prepare('SELECT id FROM users WHERE email = ?').get('close@test.local') as {
        id: number
      }
    ).id
    db.prepare(
      `INSERT INTO reminder_notifications (reminder_id, user_id, status, due_key) VALUES (?, ?, 'overdue', 'k')`,
    ).run(reminder.id, userId)

    const created = await $fetch(`/api/cars/${car.id}/entries`, {
      method: 'POST',
      headers: { cookie },
      body: {
        date: '2026-10-10',
        type: 'maintenance',
        description: 'Масло',
        mileage: 100500,
        reminderId: reminder.id,
      },
    })

    expect(created.reminder).toMatchObject({
      id: reminder.id,
      lastEntryId: created.id,
      nextDueMileage: 110500,
    })
    expect(getReminderStatus(created.reminder, 100500, '2026-10-10')).not.toBe('overdue')

    const left = db
      .prepare('SELECT COUNT(*) AS n FROM reminder_notifications WHERE reminder_id = ?')
      .get(reminder.id) as { n: number }
    db.close()
    expect(left.n).toBe(0)
  })

  it('запись без reminderId не добавляет поле reminder', async () => {
    const cookie = await registerCookie('plain@test.local')
    const car = await createCar(cookie, 'Rio')
    const created = await $fetch(`/api/cars/${car.id}/entries`, {
      method: 'POST',
      headers: { cookie },
      body: { date: '2026-10-10', type: 'other', description: 'Мойка' },
    })
    expect(created.reminder).toBeUndefined()
  })

  it('напоминание другой машины → 400, записи не создаётся', async () => {
    const cookie = await registerCookie('foreign@test.local')
    const carA = await createCar(cookie, 'A')
    const carB = await createCar(cookie, 'B')
    const reminderB = await createOverdueReminder(cookie, carB.id)

    const res = await fetch(`/api/cars/${carA.id}/entries`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        date: '2026-10-10',
        type: 'other',
        description: 'x',
        reminderId: reminderB.id,
      }),
    })
    expect(res.status).toBe(400)
    const list = await $fetch(`/api/cars/${carA.id}/entries`, { headers: { cookie } })
    expect(list).toHaveLength(0)
  })

  it('посторонний пользователь → 403', async () => {
    const ownerCookie = await registerCookie('own@test.local')
    const strangerCookie = await registerCookie('stranger@test.local')
    const car = await createCar(ownerCookie, 'C')
    const reminder = await createOverdueReminder(ownerCookie, car.id)

    const res = await fetch(`/api/cars/${car.id}/entries`, {
      method: 'POST',
      headers: { cookie: strangerCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        date: '2026-10-10',
        type: 'other',
        description: 'x',
        reminderId: reminder.id,
      }),
    })
    expect(res.status).toBe(403)
  })
})
