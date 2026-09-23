import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const dbFile = createTestDbFile()

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  dev: true,
  server: true,
  setupTimeout: 180000,
  env: {
    DB_FILE_NAME: dbFile,
    NUXT_SESSION_PASSWORD: 'a'.repeat(32),
    NUXT_SESSION_COOKIE_SECURE: 'false',
    // см. комментарий про TZ в vitest.config.ts — сервер-сабпроцесс не наследует env теста
    TZ: 'UTC',
    // Тестовый dev-сервер поднимается на отдельном порту с отдельной БД, поэтому
    // безопасно запускать его параллельно с локальным `npm run dev`
    NUXT_IGNORE_LOCK: '1'
  }
})

afterAll(() => {
  cleanupTestDbFile(dbFile)
})

/** Достаёт session-куку из ответа регистрации/логина для последующих запросов. */
function extractCookie(res: Response): string {
  const raw = res.headers.get('set-cookie')
  if (!raw) throw new Error('Ответ не содержит set-cookie')
  return raw.split(';')[0]
}

describe('auth', () => {
  it('регистрация создаёт сессию, без куки защищённый роут отвечает 401', async () => {
    await expect($fetch('/api/cars')).rejects.toMatchObject({ statusCode: 401 })

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@test.local', password: 'password1', name: 'Alice' }),
      headers: { 'content-type': 'application/json' }
    })
    expect(await res.json()).toMatchObject({ email: 'alice@test.local' })
  })

  it('логин с неверным паролем даёт 401, с верным — сессию', async () => {
    await expect(
      $fetch('/api/auth/login', { method: 'POST', body: { email: 'alice@test.local', password: 'wrong' } })
    ).rejects.toMatchObject({ statusCode: 401 })

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@test.local', password: 'password1' }),
      headers: { 'content-type': 'application/json' }
    })
    expect(await res.json()).toMatchObject({ email: 'alice@test.local' })
  })

  it('логаут сбрасывает сессию', async () => {
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@test.local', password: 'password1' }),
      headers: { 'content-type': 'application/json' }
    })
    const cookie = extractCookie(login)

    const logout = await fetch('/api/auth/logout', { method: 'POST', headers: { cookie } })
    // Сессия — подписанная кука без серверного хранилища: инвалидируется именно
    // та строка куки, которую вернул logout (просроченная), а не старая от login.
    const clearedCookie = extractCookie(logout)
    const session = await $fetch('/api/auth/session', { headers: { cookie: clearedCookie } })
    expect(session).toBeFalsy()
  })
})

describe('cars, entries, reminders', () => {
  let aliceCookie: string
  let bobCookie: string
  let carId: number

  // Не beforeAll: @nuxt/test-utils кладёт test-контекст в globalThis только
  // на время выполнения it() (через beforeEach/afterEach), в beforeAll его ещё нет.
  it('готовит сессии Alice и Bob', async () => {
    const alice = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@test.local', password: 'password1' }),
      headers: { 'content-type': 'application/json' }
    })
    aliceCookie = extractCookie(alice)

    const bob = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@test.local', password: 'password1', name: 'Bob' }),
      headers: { 'content-type': 'application/json' }
    })
    bobCookie = extractCookie(bob)
  })

  it('владелец создаёт автомобиль', async () => {
    const car = await $fetch('/api/cars', {
      method: 'POST',
      headers: { cookie: aliceCookie },
      body: { brand: 'Toyota', model: 'Camry', currentMileage: 87000 }
    })
    expect(car).toMatchObject({ brand: 'Toyota', model: 'Camry', currentMileage: 87000 })
    carId = car.id
  })

  it('чужой пользователь не видит автомобиль (403), несуществующий — 404', async () => {
    await expect($fetch(`/api/cars/${carId}`, { headers: { cookie: bobCookie } })).rejects.toMatchObject({
      statusCode: 403
    })
    await expect($fetch('/api/cars/999999', { headers: { cookie: aliceCookie } })).rejects.toMatchObject({
      statusCode: 404
    })
  })

  it('участник видит автомобиль, но не может его удалить', async () => {
    await $fetch(`/api/cars/${carId}/invite`, {
      method: 'POST',
      headers: { cookie: aliceCookie },
      body: { email: 'bob@test.local' }
    })

    const car = await $fetch(`/api/cars/${carId}`, { headers: { cookie: bobCookie } })
    expect(car.role).toBe('member')

    await expect(
      $fetch(`/api/cars/${carId}`, { method: 'DELETE', headers: { cookie: bobCookie } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  let entryId: number

  it('создание записи поднимает currentMileage автомобиля', async () => {
    const entry = await $fetch(`/api/cars/${carId}/entries`, {
      method: 'POST',
      headers: { cookie: aliceCookie },
      body: { date: '2026-03-01', type: 'maintenance', description: 'Замена масла', mileage: 88500, cost: 3000 }
    })
    entryId = entry.id

    const car = await $fetch(`/api/cars/${carId}`, { headers: { cookie: aliceCookie } })
    expect(car.currentMileage).toBe(88500)
  })

  it('фильтр и сортировка записей журнала работают', async () => {
    await $fetch(`/api/cars/${carId}/entries`, {
      method: 'POST',
      headers: { cookie: aliceCookie },
      body: { date: '2026-01-01', type: 'repair', description: 'Ремонт подвески', mileage: 88000 }
    })

    const onlyMaintenance = await $fetch(`/api/cars/${carId}/entries`, {
      headers: { cookie: aliceCookie },
      query: { type: 'maintenance' }
    })
    expect(onlyMaintenance).toHaveLength(1)
    expect(onlyMaintenance[0].type).toBe('maintenance')

    const byMileageAsc = await $fetch(`/api/cars/${carId}/entries`, {
      headers: { cookie: aliceCookie },
      query: { sortBy: 'mileage', sortDir: 'asc' }
    })
    expect(byMileageAsc.map((e: any) => e.mileage)).toEqual([88000, 88500])
  })

  it('создание напоминания с привязкой к записи пересчитывает nextDue*', async () => {
    const reminder = await $fetch(`/api/cars/${carId}/reminders`, {
      method: 'POST',
      headers: { cookie: aliceCookie },
      body: {
        title: 'Следующая замена масла',
        triggerType: 'both',
        intervalMonths: 6,
        intervalKm: 10000,
        lastEntryId: entryId
      }
    })
    expect(reminder.nextDueDate).toBe('2026-09-01')
    expect(reminder.nextDueMileage).toBe(98500)
  })
})
