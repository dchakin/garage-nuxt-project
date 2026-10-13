import Database from 'better-sqlite3'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '../../../apps/api/server/database/schema'
import { hashPassword } from '../../../apps/api/server/utils/password'
import {
  REFERENCE_PASSWORD,
  referenceCars,
  referenceUsers,
  type ReferenceCar,
  type ReferenceCategory,
  type ReferenceCarKey,
  type ReferenceUserKey,
} from './reference'

// И сама БД, и транзакция drizzle
type Db = BaseSQLiteDatabase<'sync', Database.RunResult, typeof schema>

export interface SeededUser {
  id: number
  name: string
  email: string
  password: string
}

export interface SeededReferenceData {
  users: Record<ReferenceUserKey, SeededUser>
  carIds: Record<ReferenceCarKey, number>
}

// Пока сервер держит соединение с той же БД, запись может ждать блокировку
const BUSY_TIMEOUT_MS = 5_000

let passwordHash: Promise<string> | undefined

function openDb() {
  const dbFile = process.env.E2E_DB_FILE
  if (!dbFile) throw new Error('E2E_DB_FILE не задан — его выставляет playwright.config.ts')
  const sqlite = new Database(dbFile)
  sqlite.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)
  // для каскадного удаления данных прошлого теста
  sqlite.pragma('foreign_keys = ON')
  return { sqlite, db: drizzle(sqlite, { schema }) }
}

// Удаление пользователей каскадом уносит их машины, записи, напоминания и участие
function removeReferenceUsers(db: Db) {
  const emails = Object.values(referenceUsers).map((user) => user.email)
  db.delete(schema.users).where(inArray(schema.users.email, emails)).run()
}

function insertUsers(db: Db, hash: string): SeededReferenceData['users'] {
  const entries = Object.entries(referenceUsers).map(([key, user]) => {
    const [row] = db
      .insert(schema.users)
      .values({ ...user, passwordHash: hash })
      .returning()
      .all()
    return [key, { id: row.id, name: row.name, email: row.email, password: REFERENCE_PASSWORD }]
  })
  return Object.fromEntries(entries) as SeededReferenceData['users']
}

function loadCategoryIds(db: Db) {
  const ids = new Map(
    db
      .select()
      .from(schema.categories)
      .all()
      .map((row) => [row.name, row.id]),
  )
  return (name: ReferenceCategory) => {
    const id = ids.get(name)
    if (id === undefined) throw new Error(`Нет категории «${name}» — проверьте сид категорий`)
    return id
  }
}

function insertCar(
  db: Db,
  car: ReferenceCar,
  users: SeededReferenceData['users'],
  categoryId: (name: ReferenceCategory) => number,
) {
  const { entries, reminders, members, owner, ...carFields } = car
  const [carRow] = db
    .insert(schema.cars)
    .values({ ...carFields, ownerId: users[owner].id })
    .returning()
    .all()
  const carId = carRow.id

  for (const member of members) {
    db.insert(schema.carMembers).values({ carId, userId: users[member].id }).run()
  }

  const entryIds = new Map<string, number>()
  for (const { category, ...entry } of entries) {
    const [row] = db
      .insert(schema.entries)
      .values({ ...entry, carId, authorId: users[owner].id, categoryId: categoryId(category) })
      .returning()
      .all()
    entryIds.set(entry.description, row.id)
  }

  for (const { category, lastEntry, ...reminder } of reminders) {
    db.insert(schema.reminders)
      .values({
        ...reminder,
        carId,
        categoryId: category ? categoryId(category) : null,
        lastEntryId: lastEntry ? entryIds.get(lastEntry) : null,
      })
      .run()
  }

  return carId
}

/**
 * Пересоздаёт эталонные данные макета прямо в e2e-БД: прежние эталонные пользователи
 * удаляются вместе со всем, что к ним привязано, поэтому каждый тест получает чистый набор.
 */
export async function seedReferenceData(): Promise<SeededReferenceData> {
  passwordHash ??= hashPassword(REFERENCE_PASSWORD)
  const hash = await passwordHash
  const { sqlite, db } = openDb()
  try {
    return db.transaction((tx) => {
      removeReferenceUsers(tx)
      const users = insertUsers(tx, hash)
      const categoryId = loadCategoryIds(tx)
      const carIds = Object.fromEntries(
        Object.entries(referenceCars).map(([key, car]) => [
          key,
          insertCar(tx, car, users, categoryId),
        ]),
      ) as SeededReferenceData['carIds']
      return { users, carIds }
    })
  } finally {
    sqlite.close()
  }
}
