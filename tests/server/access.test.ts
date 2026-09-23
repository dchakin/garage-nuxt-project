import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

let dbFile: string
let db: typeof import('../../server/database').db
let schema: typeof import('../../server/database').schema
let requireCarAccess: typeof import('../../server/utils/access').requireCarAccess

let ownerId: number
let memberId: number
let strangerId: number
let carId: number

beforeAll(async () => {
  dbFile = createTestDbFile()
  process.env.DB_FILE_NAME = dbFile
  ;({ db, schema } = await import('../../server/database'))
  ;({ requireCarAccess } = await import('../../server/utils/access'))

  const [owner] = await db.insert(schema.users).values({ email: 'owner@test.local', passwordHash: 'x', name: 'Owner' }).returning()
  const [member] = await db.insert(schema.users).values({ email: 'member@test.local', passwordHash: 'x', name: 'Member' }).returning()
  const [stranger] = await db.insert(schema.users).values({ email: 'stranger@test.local', passwordHash: 'x', name: 'Stranger' }).returning()
  ownerId = owner.id
  memberId = member.id
  strangerId = stranger.id

  const [car] = await db.insert(schema.cars).values({ ownerId, brand: 'Toyota', model: 'Corolla' }).returning()
  carId = car.id
  await db.insert(schema.carMembers).values({ carId, userId: memberId, role: 'member' })
})

afterAll(() => {
  cleanupTestDbFile(dbFile)
})

describe('requireCarAccess', () => {
  it('владелец получает роль owner', async () => {
    const { role } = await requireCarAccess(carId, ownerId)
    expect(role).toBe('owner')
  })

  it('участник получает роль member', async () => {
    const { role } = await requireCarAccess(carId, memberId)
    expect(role).toBe('member')
  })

  it('посторонний пользователь получает 403', async () => {
    await expect(requireCarAccess(carId, strangerId)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('несуществующий автомобиль даёт 404', async () => {
    await expect(requireCarAccess(999999, ownerId)).rejects.toMatchObject({ statusCode: 404 })
  })
})
