import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../server/database/schema'

const migrationsFolder = path.resolve(__dirname, '../../server/database/migrations')

/**
 * Создаёт отдельный файл SQLite, прогоняет на нём миграции и сидит
 * дефолтную категорию. Файл живёт до cleanupTestDbFile — better-sqlite3
 * не умеет шарить in-memory между разными Database()-подключениями,
 * поэтому используется временный файл, а не ':memory:'.
 */
export function createTestDbFile(): string {
  const file = path.join(os.tmpdir(), `garage-test-${randomUUID()}.db`)
  const sqlite = new Database(file)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })
  db.insert(schema.categories).values({ name: 'Тест-категория', isDefault: true }).run()
  sqlite.close()
  return file
}

export function cleanupTestDbFile(file: string) {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const p = file + suffix
    try {
      if (fs.existsSync(p)) fs.rmSync(p)
    } catch {
      // Windows держит файл залоченным, пока жив процесс с открытым better-sqlite3
      // соединением (server/database/index.ts открывает его один раз на модуль
      // и никогда не закрывает) — недостающая уборка временного файла не критична.
    }
  }
}
