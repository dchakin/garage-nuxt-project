import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migrationsFolder = path.resolve(__dirname, '../../server/database/migrations')
const CATEGORIES_MIGRATION = '0003_car_categories'

// Каталог миграций, обрезанный до миграции категорий: БД готовится в старой схеме.
function createMigrationsFolderBefore(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-migrations-'))
  fs.cpSync(migrationsFolder, dir, { recursive: true })
  const journalFile = path.join(dir, 'meta', '_journal.json')
  const journal = JSON.parse(fs.readFileSync(journalFile, 'utf-8'))
  const index = journal.entries.findIndex((entry: { tag: string }) => entry.tag === tag)
  journal.entries = journal.entries.slice(0, index)
  fs.writeFileSync(journalFile, JSON.stringify(journal))
  return dir
}

interface CategoryRow {
  id: number
  carId: number | null
  name: string
  isDefault: number
}

describe('миграция категорий машины', () => {
  let sqlite: Database.Database
  let oldMigrationsFolder: string
  let dbFile: string
  const ids: Record<string, number> = {}

  const insert = (sqlText: string, ...params: unknown[]) =>
    Number(sqlite.prepare(sqlText).run(...params).lastInsertRowid)

  beforeAll(() => {
    dbFile = path.join(os.tmpdir(), `garage-migration-${randomUUID()}.db`)
    sqlite = new Database(dbFile)
    sqlite.pragma('foreign_keys = ON')
    oldMigrationsFolder = createMigrationsFolderBefore(CATEGORIES_MIGRATION)
    migrate(drizzle(sqlite), { migrationsFolder: oldMigrationsFolder })

    const userId = insert(
      `INSERT INTO users (email, password_hash, name) VALUES ('a@a.ru', 'x', 'А')`,
    )
    const addCar = (brand: string) =>
      insert(`INSERT INTO cars (owner_id, brand, model) VALUES (?, ?, 'M')`, userId, brand)
    ids.car1 = addCar('Первая')
    ids.car2 = addCar('Вторая')
    const addCategory = (name: string, isDefault: number) =>
      insert(`INSERT INTO categories (name, is_default) VALUES (?, ?)`, name, isDefault)
    ids.standard = addCategory('Прочее', 1)
    ids.single = addCategory('Тюнинг', 0)
    ids.shared = addCategory('Мойка', 0)
    ids.unused = addCategory('Никому не нужна', 0)
    const addEntry = (carId: number, categoryId: number) =>
      insert(
        `INSERT INTO entries (car_id, author_id, date, type, category_id) VALUES (?, ?, '2026-01-01', 'other', ?)`,
        carId,
        userId,
        categoryId,
      )
    ids.entryStandard = addEntry(ids.car1, ids.standard)
    ids.entrySingle = addEntry(ids.car2, ids.single)
    ids.entryShared1 = addEntry(ids.car1, ids.shared)
    ids.entryShared2 = addEntry(ids.car2, ids.shared)
    ids.reminderShared2 = insert(
      `INSERT INTO reminders (car_id, title, category_id, trigger_type) VALUES (?, 'Мыть', ?, 'date')`,
      ids.car2,
      ids.shared,
    )

    migrate(drizzle(sqlite), { migrationsFolder })
  })

  afterAll(() => {
    sqlite.close()
    fs.rmSync(oldMigrationsFolder, { recursive: true, force: true })
    fs.rmSync(dbFile, { force: true })
  })

  const categoryById = (id: number) =>
    sqlite
      .prepare(
        `SELECT id, car_id AS carId, name, is_default AS isDefault FROM categories WHERE id = ?`,
      )
      .get(id) as CategoryRow | undefined
  const categoryIdOf = (table: 'entries' | 'reminders', id: number) =>
    (
      sqlite.prepare(`SELECT category_id AS categoryId FROM ${table} WHERE id = ?`).get(id) as {
        categoryId: number
      }
    ).categoryId

  it('стандартная категория остаётся общей', () => {
    expect(categoryById(ids.standard)).toMatchObject({ carId: null, name: 'Прочее' })
    expect(categoryIdOf('entries', ids.entryStandard)).toBe(ids.standard)
  })

  it('своя категория одной машины привязывается к ней', () => {
    expect(categoryById(ids.single)).toMatchObject({ carId: ids.car2, name: 'Тюнинг' })
    expect(categoryIdOf('entries', ids.entrySingle)).toBe(ids.single)
  })

  it('своя категория нескольких машин копируется на каждую с переназначением', () => {
    expect(categoryById(ids.shared)).toMatchObject({ carId: ids.car1, name: 'Мойка' })
    expect(categoryIdOf('entries', ids.entryShared1)).toBe(ids.shared)

    const copyId = categoryIdOf('entries', ids.entryShared2)
    expect(copyId).not.toBe(ids.shared)
    expect(categoryById(copyId)).toMatchObject({ carId: ids.car2, name: 'Мойка', isDefault: 0 })
    expect(categoryIdOf('reminders', ids.reminderShared2)).toBe(copyId)
  })

  it('неиспользуемая своя категория удаляется', () => {
    expect(categoryById(ids.unused)).toBeUndefined()
  })

  it('имена уникальны внутри машины и среди стандартных, но не между машинами', () => {
    const add = (name: string, carId: number | null) =>
      sqlite.prepare(`INSERT INTO categories (name, car_id) VALUES (?, ?)`).run(name, carId)
    expect(() => add('Прочее', null)).toThrow(/UNIQUE/)
    expect(() => add('Тюнинг', ids.car2)).toThrow(/UNIQUE/)
    expect(() => add('Тюнинг', ids.car1)).not.toThrow()
  })

  it('категории машины удаляются вместе с ней', () => {
    sqlite.prepare(`DELETE FROM entries WHERE car_id = ?`).run(ids.car2)
    sqlite.prepare(`DELETE FROM reminders WHERE car_id = ?`).run(ids.car2)
    sqlite.prepare(`DELETE FROM cars WHERE id = ?`).run(ids.car2)
    expect(categoryById(ids.single)).toBeUndefined()
  })
})
