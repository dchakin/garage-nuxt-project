import { afterAll, describe, expect, it } from 'vitest'
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

function addEntry(cookie: string, carId: number, date: string, cost: number, mileage: number) {
  return $fetch(`/api/cars/${carId}/entries`, {
    method: 'POST',
    headers: { cookie },
    body: { date, type: 'repair', description: 'Работа', cost, mileage },
  })
}

describe('GET /api/cars/[id]/analytics', () => {
  it('считает период и соседние периоды с тратами', async () => {
    const cookie = await registerCookie('analytics-a@test.local')
    const car = await createCar(cookie)
    await addEntry(cookie, car.id, '2026-06-10', 1000, 90000)
    await addEntry(cookie, car.id, '2026-08-10', 3000, 92000)

    const res = await fetch(`/api/cars/${car.id}/analytics?period=month&date=2026-07`, {
      headers: { cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(0)
    expect(body.hasAnyExpenses).toBe(true)
    expect(body.prevPeriodWithExpenses).toBe('2026-06')
    expect(body.nextPeriodWithExpenses).toBe('2026-08')

    const year = await $fetch(`/api/cars/${car.id}/analytics?period=year&date=2026`, {
      headers: { cookie },
    })
    expect(year.total).toBe(4000)
    expect(year.costPerKm).toBe(2)
    expect(year.byCategory[0].share).toBe(100)
  })

  it('машина без трат — hasAnyExpenses false', async () => {
    const cookie = await registerCookie('analytics-b@test.local')
    const car = await createCar(cookie)
    const body = await $fetch(`/api/cars/${car.id}/analytics`, { headers: { cookie } })
    expect(body.hasAnyExpenses).toBe(false)
    expect(body.total).toBe(0)
  })

  it('400 на неверную дату, 403 постороннему', async () => {
    const ownerCookie = await registerCookie('analytics-c@test.local')
    const strangerCookie = await registerCookie('analytics-d@test.local')
    const car = await createCar(ownerCookie)

    const bad = await fetch(`/api/cars/${car.id}/analytics?period=month&date=2026`, {
      headers: { cookie: ownerCookie },
    })
    expect(bad.status).toBe(400)
    const forbidden = await fetch(`/api/cars/${car.id}/analytics`, {
      headers: { cookie: strangerCookie },
    })
    expect(forbidden.status).toBe(403)
  })
})
