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

async function register(email: string, name = 'Тест') {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password1', name }),
    headers: { 'content-type': 'application/json' },
  })
  const cookie = res.headers.get('set-cookie')!.split(';')[0]
  const body = await res.json()
  return { cookie, userId: body.id as number }
}

async function setup(prefix: string) {
  const owner = await register(`${prefix}-owner@test.local`, 'Владелец')
  const member = await register(`${prefix}-member@test.local`)
  const other = await register(`${prefix}-other@test.local`)
  const stranger = await register(`${prefix}-stranger@test.local`)
  const car = await $fetch('/api/cars', {
    method: 'POST',
    headers: { cookie: owner.cookie },
    body: { brand: 'Toyota', model: 'Camry', currentMileage: 100000 },
  })
  for (const email of [`${prefix}-member@test.local`, `${prefix}-other@test.local`]) {
    await $fetch(`/api/cars/${car.id}/invite`, {
      method: 'POST',
      headers: { cookie: owner.cookie },
      body: { email },
    })
  }
  return { owner, member, other, stranger, carId: car.id as number }
}

function call(cookie: string, path: string, method = 'DELETE') {
  return fetch(path, { method, headers: { cookie } })
}

describe('участники машины', () => {
  it('владелец удаляет участника, тот получает 403', async () => {
    const { owner, member, carId } = await setup('rm')

    const res = await call(owner.cookie, `/api/cars/${carId}/members/${member.userId}`)
    expect(res.status).toBe(200)
    expect((await call(member.cookie, `/api/cars/${carId}`, 'GET')).status).toBe(403)
  })

  it('участник не может удалить другого участника', async () => {
    const { member, other, carId } = await setup('rm403')

    const res = await call(member.cookie, `/api/cars/${carId}/members/${other.userId}`)
    expect(res.status).toBe(403)
  })

  it('владельца удалить нельзя (400)', async () => {
    const { owner, carId } = await setup('rmowner')

    const res = await call(owner.cookie, `/api/cars/${carId}/members/${owner.userId}`)
    expect(res.status).toBe(400)
  })

  it('участник выходит и теряет доступ', async () => {
    const { member, carId } = await setup('leave')

    const res = await call(member.cookie, `/api/cars/${carId}/members/me`)
    expect(res.status).toBe(200)
    expect((await call(member.cookie, `/api/cars/${carId}`, 'GET')).status).toBe(403)
  })

  it('владелец не может выйти (400)', async () => {
    const { owner, carId } = await setup('leaveowner')

    const res = await call(owner.cookie, `/api/cars/${carId}/members/me`)
    expect(res.status).toBe(400)
  })

  it('посторонний получает 403', async () => {
    const { stranger, member, carId } = await setup('stranger')

    expect((await call(stranger.cookie, `/api/cars/${carId}`, 'GET')).status).toBe(403)
    expect(
      (await call(stranger.cookie, `/api/cars/${carId}/members/${member.userId}`)).status,
    ).toBe(403)
    expect((await call(stranger.cookie, `/api/cars/${carId}/members/me`)).status).toBe(403)
  })

  it('invite: коды ошибок user_not_found и already_member', async () => {
    const { owner, carId } = await setup('invite')
    const invite = (email: string) =>
      fetch(`/api/cars/${carId}/invite`, {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })

    const missing = await invite('nobody@test.local')
    expect(missing.status).toBe(404)
    expect((await missing.json()).statusMessage).toBe('user_not_found')

    const dup = await invite('invite-member@test.local')
    expect(dup.status).toBe(409)
    expect((await dup.json()).statusMessage).toBe('already_member')
  })

  it('GET /api/cars/[id] отдаёт ownerName и счётчики', async () => {
    const { owner, carId } = await setup('detail')
    await $fetch(`/api/cars/${carId}/entries`, {
      method: 'POST',
      headers: { cookie: owner.cookie },
      body: { date: '2026-10-01', type: 'repair', description: 'Тест', mileage: 100500 },
    })

    const detail = await $fetch(`/api/cars/${carId}`, { headers: { cookie: owner.cookie } })
    expect(detail.ownerName).toBe('Владелец')
    expect(detail.entriesCount).toBe(1)
    expect(detail.remindersCount).toBe(0)
  })
})
