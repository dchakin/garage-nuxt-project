import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const dbFileName = process.env.DB_FILE_NAME || 'server/database/garage.db'

const sqlite = new Database(dbFileName)
const db = drizzle(sqlite)

migrate(db, { migrationsFolder: './server/database/migrations' })

console.log('Миграции применены к', dbFileName)
sqlite.close()
