import { sql, relations } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const cars = sqliteTable('cars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year'),
  plateNumber: text('plate_number'),
  vin: text('vin'),
  currentMileage: integer('current_mileage').notNull().default(0),
  photoUrl: text('photo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const carMembers = sqliteTable('car_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id').notNull().references(() => cars.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  invitedAt: integer('invited_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false)
})

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id').notNull().references(() => cars.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date, e.g. 2026-07-09
  type: text('type', { enum: ['repair', 'replacement', 'purchase', 'maintenance', 'other'] }).notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  description: text('description').notNull().default(''),
  mileage: integer('mileage'),
  cost: real('cost'),
  currency: text('currency').notNull().default('RUB'),
  place: text('place'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id').notNull().references(() => cars.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  triggerType: text('trigger_type', { enum: ['date', 'mileage', 'both'] }).notNull(),
  intervalMonths: integer('interval_months'),
  intervalKm: integer('interval_km'),
  lastEntryId: integer('last_entry_id').references(() => entries.id),
  nextDueDate: text('next_due_date'),
  nextDueMileage: integer('next_due_mileage'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const usersRelations = relations(users, ({ many }) => ({
  cars: many(cars),
  carMemberships: many(carMembers),
  entries: many(entries)
}))

export const carsRelations = relations(cars, ({ one, many }) => ({
  owner: one(users, { fields: [cars.ownerId], references: [users.id] }),
  members: many(carMembers),
  entries: many(entries),
  reminders: many(reminders)
}))

export const carMembersRelations = relations(carMembers, ({ one }) => ({
  car: one(cars, { fields: [carMembers.carId], references: [cars.id] }),
  user: one(users, { fields: [carMembers.userId], references: [users.id] })
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  entries: many(entries),
  reminders: many(reminders)
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  car: one(cars, { fields: [entries.carId], references: [cars.id] }),
  author: one(users, { fields: [entries.authorId], references: [users.id] }),
  category: one(categories, { fields: [entries.categoryId], references: [categories.id] })
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  car: one(cars, { fields: [reminders.carId], references: [cars.id] }),
  category: one(categories, { fields: [reminders.categoryId], references: [categories.id] }),
  lastEntry: one(entries, { fields: [reminders.lastEntryId], references: [entries.id] })
}))
