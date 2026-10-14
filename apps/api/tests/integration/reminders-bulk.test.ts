import { afterAll, describe, expect, it } from 'vitest'
import { todayIso } from '@garage/shared/utils/format'
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

async function createCar(cookie: string) {
  return $fetch('/api/cars', {
    method: 'POST',
    headers: { cookie },
    body: { brand: 'Toyota', model: 'Camry', currentMileage: 100000 },
  })
}

function postBulk(cookie: string, carId: number, reminders: unknown[]) {
  return fetch(`/api/cars/${carId}/reminders/bulk`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ reminders }),
  })
}

async function listReminders(cookie: string, carId: number) {
  return $fetch(`/api/cars/${carId}/reminders`, { headers: { cookie } })
}

describe('POST /api/cars/[id]/reminders/bulk', () => {
  it('считает срок от last', async () => {
    const cookie = await registerCookie('bulk-last@test.local')
    const car = await createCar(cookie)
    const res = await postBulk(cookie, car.id, [
      {
        title: 'Замена масла',
        intervalKm: 10000,
        intervalMonths: 12,
        last: { date: '2026-01-15', mileage: 95000 },
      },
    ])
    expect(res.status).toBe(200)
    const [reminder] = await res.json()
    expect(reminder).toMatchObject({
      title: 'Замена масла',
      triggerType: 'both',
      nextDueDate: '2027-01-15',
      nextDueMileage: 105000,
    })
  })

  it('берёт nextDueDate как есть', async () => {
    const cookie = await registerCookie('bulk-date@test.local')
    const car = await createCar(cookie)
    const res = await postBulk(cookie, car.id, [
      { title: 'ОСАГО', intervalMonths: 12, nextDueDate: '2026-10-15' },
    ])
    const [reminder] = await res.json()
    expect(reminder).toMatchObject({
      triggerType: 'date',
      nextDueDate: '2026-10-15',
      nextDueMileage: null,
    })
  })

  it('без last и nextDueDate считает от сегодня и текущего пробега', async () => {
    const cookie = await registerCookie('bulk-none@test.local')
    const car = await createCar(cookie)
    const res = await postBulk(cookie, car.id, [
      { title: 'ТО', intervalKm: 15000, intervalMonths: 12 },
      { title: 'Шины', intervalKm: 5000 },
    ])
    const created = await res.json()
    expect(created).toHaveLength(2)
    const year = Number(todayIso().slice(0, 4)) + 1
    expect(created[0].nextDueDate?.startsWith(String(year))).toBe(true)
    expect(created[0].nextDueMileage).toBe(115000)
    expect(created[1]).toMatchObject({ triggerType: 'mileage', nextDueMileage: 105000 })
  })

  it('чужому — 403', async () => {
    const owner = await registerCookie('bulk-owner@test.local')
    const stranger = await registerCookie('bulk-stranger@test.local')
    const car = await createCar(owner)
    const res = await postBulk(stranger, car.id, [{ title: 'ТО', intervalKm: 1000 }])
    expect(res.status).toBe(403)
    expect(await listReminders(owner, car.id)).toHaveLength(0)
  })

  it('невалидный элемент — 400, ничего не создано', async () => {
    const cookie = await registerCookie('bulk-invalid@test.local')
    const car = await createCar(cookie)
    const res = await postBulk(cookie, car.id, [
      { title: 'Хороший', intervalKm: 1000 },
      { title: 'Без условий' },
    ])
    expect(res.status).toBe(400)
    expect(await listReminders(cookie, car.id)).toHaveLength(0)
  })
})
