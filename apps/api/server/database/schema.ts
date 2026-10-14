import { sql, relations } from 'drizzle-orm'
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  // Растёт при сбросе пароля: cookie-сессии с другой версией считаются недействительными.
  sessionVersion: integer('session_version').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const cars = sqliteTable('cars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year'),
  plateNumber: text('plate_number'),
  vin: text('vin'),
  currentMileage: integer('current_mileage').notNull().default(0),
  mileageUpdatedAt: integer('mileage_updated_at', { mode: 'timestamp' }),
  photoUrl: text('photo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const carMembers = sqliteTable('car_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] })
    .notNull()
    .default('member'),
  invitedAt: integer('invited_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// carId = null — стандартная категория (общая для всех машин), иначе — своя категория машины.
// SQLite считает NULL разными значениями, поэтому имена стандартных уникальны отдельным
// частичным индексом (на нём держится onConflictDoNothing в seed.ts).
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    carId: integer('car_id').references(() => cars.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    uniqueIndex('categories_car_name_unique').on(t.carId, t.name),
    uniqueIndex('categories_default_name_unique')
      .on(t.name)
      .where(sql`${t.carId} is null`),
  ],
)

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date, e.g. 2026-07-09
  type: text('type', {
    enum: ['repair', 'replacement', 'purchase', 'maintenance', 'other'],
  }).notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  description: text('description').notNull().default(''),
  mileage: integer('mileage'),
  cost: real('cost'),
  currency: text('currency').notNull().default('RUB'),
  place: text('place'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  carId: integer('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  triggerType: text('trigger_type', { enum: ['date', 'mileage', 'both'] }).notNull(),
  intervalMonths: integer('interval_months'),
  intervalKm: integer('interval_km'),
  lastEntryId: integer('last_entry_id').references(() => entries.id),
  nextDueDate: text('next_due_date'),
  nextDueMileage: integer('next_due_mileage'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Подписки Web Push: у пользователя может быть несколько устройств/браузеров
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Refresh-токены мобильного клиента (Authorization: Bearer). Хранится только SHA-256 токена,
// токен одноразовый — при обмене на новую пару запись удаляется (см. server/utils/auth.ts).
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Одноразовые токены сброса пароля; в БД только SHA-256 токена из письма.
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Журнал отправленных push-уведомлений о напоминаниях — чтобы не слать одно и то же
// каждый день. dueKey фиксирует срок (дата|пробег), на который уже уведомили:
// после продления напоминания срок меняется и уведомление придёт снова.
export const reminderNotifications = sqliteTable(
  'reminder_notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reminderId: integer('reminder_id')
      .notNull()
      .references(() => reminders.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['soon', 'overdue'] }).notNull(),
    dueKey: text('due_key').notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('reminder_notifications_unique').on(t.reminderId, t.userId, t.status, t.dueKey),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  cars: many(cars),
  carMemberships: many(carMembers),
  entries: many(entries),
  pushSubscriptions: many(pushSubscriptions),
}))

export const carsRelations = relations(cars, ({ one, many }) => ({
  owner: one(users, { fields: [cars.ownerId], references: [users.id] }),
  members: many(carMembers),
  entries: many(entries),
  reminders: many(reminders),
  categories: many(categories),
}))

export const carMembersRelations = relations(carMembers, ({ one }) => ({
  car: one(cars, { fields: [carMembers.carId], references: [cars.id] }),
  user: one(users, { fields: [carMembers.userId], references: [users.id] }),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  car: one(cars, { fields: [categories.carId], references: [cars.id] }),
  entries: many(entries),
  reminders: many(reminders),
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  car: one(cars, { fields: [entries.carId], references: [cars.id] }),
  author: one(users, { fields: [entries.authorId], references: [users.id] }),
  category: one(categories, { fields: [entries.categoryId], references: [categories.id] }),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  car: one(cars, { fields: [reminders.carId], references: [cars.id] }),
  category: one(categories, { fields: [reminders.categoryId], references: [categories.id] }),
  lastEntry: one(entries, { fields: [reminders.lastEntryId], references: [entries.id] }),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}))
