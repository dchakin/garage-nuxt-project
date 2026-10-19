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

interface CategoryRow {
  id: number
  carId: number | null
  name: string
  isDefault: boolean
  entriesCount: number
}

async function register(email: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password1', name: 'Тест' }),
    headers: { 'content-type': 'application/json' },
  })
  return { cookie: res.headers.get('set-cookie')!.split(';')[0] }
}

async function createCar(cookie: string) {
  const car = await $fetch('/api/cars', {
    method: 'POST',
    headers: { cookie },
    body: { brand: 'Toyota', model: 'Camry', currentMileage: 1000 },
  })
  return car.id as number
}

async function setup(prefix: string) {
  const owner = await register(`${prefix}-owner@test.local`)
  const member = await register(`${prefix}-member@test.local`)
  const stranger = await register(`${prefix}-stranger@test.local`)
  const carId = await createCar(owner.cookie)
  await $fetch(`/api/cars/${carId}/invite`, {
    method: 'POST',
    headers: { cookie: owner.cookie },
    body: { email: `${prefix}-member@test.local` },
  })
  return { owner, member, stranger, carId }
}

function send(cookie: string, path: string, method: string, body?: unknown) {
  return fetch(path, {
    method,
    headers: { cookie, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function listCategories(cookie: string, carId: number) {
  return $fetch<CategoryRow[]>(`/api/cars/${carId}/categories`, { headers: { cookie } })
}

async function addCategory(cookie: string, carId: number, name: string) {
  const res = await send(cookie, `/api/cars/${carId}/categories`, 'POST', { name })
  return { status: res.status, body: (await res.json()) as CategoryRow }
}

describe('категории машины', () => {
  it('список — стандартные и свои этой машины, со счётчиком записей', async () => {
    const { owner, carId } = await setup('list')
    const own = await addCategory(owner.cookie, carId, 'Шины')
    expect(own.status).toBe(200)
    expect(own.body).toMatchObject({ carId, name: 'Шины', isDefault: false, entriesCount: 0 })

    const list = await listCategories(owner.cookie, carId)
    expect(list.map((c) => c.name).sort()).toEqual(['Прочее', 'Тест-категория', 'Шины'].sort())
    expect(list.find((c) => c.name === 'Прочее')?.carId).toBeNull()
  })

  it('изоляция: своя категория не видна другой машине', async () => {
    const { owner, carId } = await setup('iso')
    const otherCarId = await createCar(owner.cookie)
    await addCategory(owner.cookie, carId, 'Только первая')

    const names = (await listCategories(owner.cookie, otherCarId)).map((c) => c.name)
    expect(names).not.toContain('Только первая')
  })

  it('участник создаёт категорию, посторонний получает 403, без входа — 401', async () => {
    const { member, stranger, carId } = await setup('access')

    expect((await addCategory(member.cookie, carId, 'От участника')).status).toBe(200)
    expect((await send(stranger.cookie, `/api/cars/${carId}/categories`, 'GET')).status).toBe(403)
    expect((await addCategory(stranger.cookie, carId, 'Взлом')).status).toBe(403)
    expect((await fetch(`/api/cars/${carId}/categories`)).status).toBe(401)
  })

  it('дубликат имени, в том числе стандартного, — 409; пустое имя — 400', async () => {
    const { owner, carId } = await setup('dup')
    await addCategory(owner.cookie, carId, 'Шины')

    expect((await addCategory(owner.cookie, carId, 'Шины')).status).toBe(409)
    expect((await addCategory(owner.cookie, carId, 'Прочее')).status).toBe(409)
    expect((await addCategory(owner.cookie, carId, '   ')).status).toBe(400)
  })

  it('одно и то же имя можно использовать на разных машинах', async () => {
    const { owner, carId } = await setup('samename')
    const otherCarId = await createCar(owner.cookie)

    expect((await addCategory(owner.cookie, carId, 'Шины')).status).toBe(200)
    expect((await addCategory(owner.cookie, otherCarId, 'Шины')).status).toBe(200)
  })

  it('переименование своей категории; конфликт имени — 409', async () => {
    const { owner, member, carId } = await setup('patch')
    const tires = await addCategory(owner.cookie, carId, 'Шины')
    await addCategory(owner.cookie, carId, 'Мойка')
    const path = `/api/categories/${tires.body.id}`

    const renamed = await send(member.cookie, path, 'PATCH', { name: 'Резина' })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({ id: tires.body.id, name: 'Резина' })
    expect((await send(owner.cookie, path, 'PATCH', { name: 'Мойка' })).status).toBe(409)
    expect((await send(owner.cookie, path, 'PATCH', { name: 'Резина' })).status).toBe(200)
  })

  it('стандартные категории неизменны: PATCH и DELETE дают 403', async () => {
    const { owner, carId } = await setup('standard')
    const standard = (await listCategories(owner.cookie, carId)).find((c) => c.isDefault)!
    const path = `/api/categories/${standard.id}`

    expect((await send(owner.cookie, path, 'PATCH', { name: 'Иначе' })).status).toBe(403)
    expect((await send(owner.cookie, path, 'DELETE')).status).toBe(403)
    expect((await listCategories(owner.cookie, carId)).map((c) => c.name)).toContain(standard.name)
  })

  it('посторонний не меняет и не удаляет чужую категорию; несуществующая — 404', async () => {
    const { owner, stranger, carId } = await setup('foreign')
    const own = await addCategory(owner.cookie, carId, 'Шины')
    const path = `/api/categories/${own.body.id}`

    expect((await send(stranger.cookie, path, 'PATCH', { name: 'X' })).status).toBe(403)
    expect((await send(stranger.cookie, path, 'DELETE')).status).toBe(403)
    expect((await send(owner.cookie, '/api/categories/999999', 'DELETE')).status).toBe(404)
  })

  it('удаление: записи уходят в «Прочее», у напоминаний категория сбрасывается', async () => {
    const { owner, carId } = await setup('delete')
    const own = await addCategory(owner.cookie, carId, 'Шины')
    const other = (await listCategories(owner.cookie, carId)).find((c) => c.name === 'Прочее')!

    const entry = await $fetch(`/api/cars/${carId}/entries`, {
      method: 'POST',
      headers: { cookie: owner.cookie },
      body: {
        date: '2026-03-01',
        type: 'other',
        description: 'Шиномонтаж',
        categoryId: own.body.id,
      },
    })
    const reminder = await $fetch(`/api/cars/${carId}/reminders`, {
      method: 'POST',
      headers: { cookie: owner.cookie },
      body: { title: 'Сезонная смена', intervalMonths: 6, categoryId: own.body.id },
    })

    const res = await send(owner.cookie, `/api/categories/${own.body.id}`, 'DELETE')
    expect(res.status).toBe(200)

    const entries = await $fetch<Array<{ id: number; categoryId: number | null }>>(
      `/api/cars/${carId}/entries`,
      { headers: { cookie: owner.cookie } },
    )
    expect(entries.find((e) => e.id === entry.id)?.categoryId).toBe(other.id)
    const reminders = await $fetch<Array<{ id: number; categoryId: number | null }>>(
      `/api/cars/${carId}/reminders`,
      { headers: { cookie: owner.cookie } },
    )
    expect(reminders.find((r) => r.id === reminder.id)?.categoryId).toBeNull()

    const list = await listCategories(owner.cookie, carId)
    expect(list.map((c) => c.name)).not.toContain('Шины')
    expect(list.find((c) => c.id === other.id)?.entriesCount).toBe(1)
  })

  it('старые глобальные роуты /api/categories удалены', async () => {
    const { owner } = await setup('legacy')

    expect((await send(owner.cookie, '/api/categories', 'GET')).status).toBe(404)
    expect([404, 405]).toContain(
      (await send(owner.cookie, '/api/categories', 'POST', { name: 'X' })).status,
    )
  })
})
