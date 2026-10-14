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

function patchMileage(cookie: string, carId: number, body: unknown) {
  return fetch(`/api/cars/${carId}/mileage`, {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/cars/[id]/mileage', () => {
  it('обновляет пробег вверх и меняет mileageUpdatedAt', async () => {
    const cookie = await registerCookie('mileage-up@test.local')
    const car = await createCar(cookie)
    expect(car.mileageUpdatedAt).toBeNull()

    const res = await patchMileage(cookie, car.id, { mileage: 101000 })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.currentMileage).toBe(101000)
    expect(updated.mileageUpdatedAt).not.toBeNull()
  })

  it('400 при уменьшении без confirmDecrease', async () => {
    const cookie = await registerCookie('mileage-down@test.local')
    const car = await createCar(cookie)

    const res = await patchMileage(cookie, car.id, { mileage: 90000 })
    expect(res.status).toBe(400)
    expect((await res.json()).statusMessage).toBe('mileage_decrease_unconfirmed')
    const current = await $fetch(`/api/cars/${car.id}`, { headers: { cookie } })
    expect(current.currentMileage).toBe(100000)
  })

  it('200 при уменьшении с confirmDecrease', async () => {
    const cookie = await registerCookie('mileage-confirm@test.local')
    const car = await createCar(cookie)

    const res = await patchMileage(cookie, car.id, { mileage: 90000, confirmDecrease: true })
    expect(res.status).toBe(200)
    expect((await res.json()).currentMileage).toBe(90000)
  })

  it('участник может обновить пробег', async () => {
    const ownerCookie = await registerCookie('mileage-owner@test.local')
    const memberCookie = await registerCookie('mileage-member@test.local')
    const car = await createCar(ownerCookie)
    await $fetch(`/api/cars/${car.id}/invite`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: { email: 'mileage-member@test.local' },
    })

    const res = await patchMileage(memberCookie, car.id, { mileage: 105000 })
    expect(res.status).toBe(200)
    expect((await res.json()).currentMileage).toBe(105000)
  })

  it('посторонний получает 403', async () => {
    const ownerCookie = await registerCookie('mileage-own2@test.local')
    const strangerCookie = await registerCookie('mileage-stranger@test.local')
    const car = await createCar(ownerCookie)

    const res = await patchMileage(strangerCookie, car.id, { mileage: 105000 })
    expect(res.status).toBe(403)
  })

  it('PATCH /api/cars/[id] больше не меняет пробег', async () => {
    const cookie = await registerCookie('mileage-patch@test.local')
    const car = await createCar(cookie)

    const updated = await $fetch(`/api/cars/${car.id}`, {
      method: 'PATCH',
      headers: { cookie },
      body: { model: 'Corolla', currentMileage: 1 },
    })
    expect(updated.model).toBe('Corolla')
    expect(updated.currentMileage).toBe(100000)
  })

  it('запись с ростом пробега обновляет mileageUpdatedAt', async () => {
    const cookie = await registerCookie('mileage-entry@test.local')
    const car = await createCar(cookie)

    await $fetch(`/api/cars/${car.id}/entries`, {
      method: 'POST',
      headers: { cookie },
      body: { date: '2026-10-01', type: 'repair', description: 'Тест', mileage: 100500 },
    })
    const current = await $fetch(`/api/cars/${car.id}`, { headers: { cookie } })
    expect(current.currentMileage).toBe(100500)
    expect(current.mileageUpdatedAt).not.toBeNull()
  })
})
