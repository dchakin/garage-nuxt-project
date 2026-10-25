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

describe('госномер машины хранится заглавными буквами', () => {
  it('POST /api/cars приводит номер к верхнему регистру', async () => {
    const cookie = await registerCookie('plate-create@test.local')
    const car = await $fetch('/api/cars', {
      method: 'POST',
      headers: { cookie },
      body: { brand: 'Lada', model: 'Largus', plateNumber: 'у911рв' },
    })
    expect(car.plateNumber).toBe('У911РВ')
  })

  it('PATCH /api/cars/[id] приводит номер к верхнему регистру', async () => {
    const cookie = await registerCookie('plate-update@test.local')
    const car = await $fetch('/api/cars', {
      method: 'POST',
      headers: { cookie },
      body: { brand: 'Lada', model: 'Largus' },
    })
    const updated = await $fetch(`/api/cars/${car.id}`, {
      method: 'PATCH',
      headers: { cookie },
      body: { plateNumber: 'а123вс 77' },
    })
    expect(updated.plateNumber).toBe('А123ВС 77')
  })
})
