import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { categories } from './schema'

const dbFileName = process.env.DB_FILE_NAME || 'server/database/garage.db'

const sqlite = new Database(dbFileName)
const db = drizzle(sqlite)

const defaultCategories = [
  'Двигатель',
  'Тормоза',
  'Шины',
  'Масло и фильтры',
  'Кузов',
  'Электрика',
  'Подвеска',
  'Прочее'
]

for (const name of defaultCategories) {
  db.insert(categories)
    .values({ name, isDefault: true })
    .onConflictDoNothing()
    .run()
}

console.log('Категории по умолчанию добавлены')
sqlite.close()
