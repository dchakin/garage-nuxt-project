import type { EntryType } from './schemas/entry'
import type { ReminderTriggerType } from './schemas/reminder'

export interface Car {
  id: number
  ownerId: number
  brand: string
  model: string
  year: number | null
  plateNumber: string | null
  vin: string | null
  currentMileage: number
  mileageUpdatedAt: string | null
  photoUrl: string | null
  createdAt: string
}

export interface CarMember {
  id: number
  role: 'owner' | 'member'
  user: { id: number; email: string; name: string }
}

export interface CarDetail extends Car {
  role: 'owner' | 'member'
  members: CarMember[]
  ownerName: string
  entriesCount: number
  remindersCount: number
}

export interface Category {
  id: number
  /** null — стандартная категория, иначе — своя категория этой машины */
  carId: number | null
  name: string
  isDefault: boolean
}

export interface Entry {
  id: number
  carId: number
  authorId: number
  author: { id: number; name: string }
  date: string
  type: EntryType
  categoryId: number | null
  category: Category | null
  description: string
  mileage: number | null
  cost: number | null
  currency: string
  place: string | null
  createdAt: string
}

/** Ответ `POST /api/cars/[id]/entries`: при `reminderId` — ещё и обновлённое (закрытое) напоминание */
export interface CreatedEntry extends Entry {
  reminder?: Pick<Reminder, 'id' | 'title' | 'nextDueDate' | 'nextDueMileage'>
}

export interface Reminder {
  id: number
  carId: number
  title: string
  categoryId: number | null
  category: Category | null
  triggerType: ReminderTriggerType
  intervalMonths: number | null
  intervalKm: number | null
  lastEntryId: number | null
  lastEntry: Entry | null
  nextDueDate: string | null
  nextDueMileage: number | null
  isActive: boolean
  createdAt: string
}

export type ReminderStatus = 'overdue' | 'soon' | 'ok' | 'inactive'

/** Пользователь, как его отдаёт API авторизации. */
export interface AuthUser {
  id: number
  email: string
  name: string
}

/** Пара токенов для мобильного клиента (Authorization: Bearer). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  /** Срок жизни access-токена в секундах. */
  expiresIn: number
}

/** Аналитика расходов машины за период (`GET /api/cars/[id]/analytics`). */
export interface CarAnalytics {
  total: number
  avgPerMonth: number
  costPerKm: number
  avgEntry: number
  topMonth: { month: string; total: number } | null
  /** 12 месяцев года периода (month/year) или от первого до последнего месяца с тратой (all) */
  byMonth: Array<{ month: string; total: number }>
  byCategory: Array<{ categoryId: number | null; name: string; total: number; share: number }>
  hasAnyExpenses: boolean
  /** `YYYY-MM` для month, `YYYY` для year; для all — null */
  prevPeriodWithExpenses: string | null
  nextPeriodWithExpenses: string | null
}

/** Ответ login/register: пользователь; `tokens` есть только при `authMode: 'token'`. */
export interface AuthResponse extends AuthUser {
  tokens?: AuthTokens
}
