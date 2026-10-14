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

async function registerCookie(email: string, name: string): Promise<string> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password1', name }),
    headers: { 'content-type': 'application/json' },
  })
  return res.headers.get('set-cookie')!.split(';')[0]
}

describe('автор записи', () => {
  it('запись участника отдаётся владельцу с именем участника, без email', async () => {
    const ownerCookie = await registerCookie('owner@test.local', 'Дмитрий')
    const memberCookie = await registerCookie('member@test.local', 'Анна')

    const car = await $fetch('/api/cars', {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: { brand: 'Toyota', model: 'Camry', currentMileage: 1000 },
    })
    await $fetch(`/api/cars/${car.id}/invite`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: { email: 'member@test.local' },
    })

    const created = await $fetch(`/api/cars/${car.id}/entries`, {
      method: 'POST',
      headers: { cookie: memberCookie },
      body: { date: '2026-03-01', type: 'other', description: 'Мойка' },
    })
    expect(created.author).toEqual({ id: created.authorId, name: 'Анна' })

    const list = await $fetch(`/api/cars/${car.id}/entries`, { headers: { cookie: ownerCookie } })
    expect(list).toHaveLength(1)
    expect(list[0].author).toEqual({ id: created.authorId, name: 'Анна' })

    const single = await $fetch(`/api/entries/${created.id}`, { headers: { cookie: ownerCookie } })
    expect(single.author).toEqual({ id: created.authorId, name: 'Анна' })

    const patched = await $fetch(`/api/entries/${created.id}`, {
      method: 'PATCH',
      headers: { cookie: ownerCookie },
      body: { description: 'Мойка кузова' },
    })
    expect(patched).toMatchObject({ description: 'Мойка кузова', author: { name: 'Анна' } })
    expect(JSON.stringify(patched)).not.toContain('member@test.local')
  })
})
