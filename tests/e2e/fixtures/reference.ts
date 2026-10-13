import type { EntryType } from '@garage/shared/schemas/entry'
import type { ReminderTriggerType } from '@garage/shared/schemas/reminder'
import { camryEntries, camryReminders } from './referenceCamry'

// Эталонные данные макета design/garage.pen — раздел «Эталонные данные» в
// docs/plans/design-ux-fixes.md. Менять только вместе с ним: на эти цифры опираются
// e2e-проверки и скриншоты экранов. «Сейчас» — FIXED_NOW (helpers/test.ts), 10 окт 2026.

/** Общий пароль всех эталонных пользователей. */
export const REFERENCE_PASSWORD = 'garage-e2e'

export type ReferenceUserKey = 'dmitry' | 'anna' | 'sergey' | 'olga'

export const referenceUsers: Record<ReferenceUserKey, { name: string; email: string }> = {
  /** Главный пользователь макета: владелец Camry и Kia Rio, участник Lada Largus. */
  dmitry: { name: 'Дмитрий', email: 'dmitry@mail.ru' },
  /** Участник Camry. */
  anna: { name: 'Анна', email: 'anna@mail.ru' },
  /** Пример для добавления участника — ни к одной машине не привязан. */
  sergey: { name: 'Сергей', email: 'sergey@mail.ru' },
  /** Владелец Lada Largus (экран З4). */
  olga: { name: 'Ольга', email: 'olga@mail.ru' },
}

/** Название категории из сида по умолчанию (apps/api/server/database/seed.ts). */
export type ReferenceCategory =
  'Двигатель' | 'Тормоза' | 'Шины' | 'Масло и фильтры' | 'Электрика' | 'Подвеска' | 'Прочее'

export interface ReferenceEntry {
  date: string
  mileage: number
  description: string
  cost: number
  type: EntryType
  category: ReferenceCategory
  place: string | null
}

export interface ReferenceReminder {
  title: string
  triggerType: ReminderTriggerType
  intervalMonths: number | null
  intervalKm: number | null
  nextDueDate: string | null
  nextDueMileage: number | null
  category: ReferenceCategory | null
  /** description записи, от которой считается срок. */
  lastEntry: string | null
  isActive: boolean
}

export interface ReferenceCar {
  brand: string
  model: string
  year: number
  plateNumber: string
  vin: string | null
  currentMileage: number
  owner: ReferenceUserKey
  members: ReferenceUserKey[]
  entries: ReferenceEntry[]
  reminders: ReferenceReminder[]
}

export type ReferenceCarKey = 'camry' | 'rio' | 'largus'

export const referenceCars: Record<ReferenceCarKey, ReferenceCar> = {
  camry: {
    brand: 'Toyota',
    model: 'Camry',
    year: 2018,
    plateNumber: 'А123ВС 77',
    vin: 'JTNB11HK103012345',
    currentMileage: 87_450,
    owner: 'dmitry',
    members: ['anna'],
    entries: camryEntries,
    reminders: camryReminders,
  },
  // «Всё в порядке»: ни записей, ни напоминаний
  rio: {
    brand: 'Kia',
    model: 'Rio',
    year: 2021,
    plateNumber: 'М456ОР 799',
    vin: null,
    currentMileage: 42_100,
    owner: 'dmitry',
    members: [],
    entries: [],
    reminders: [],
  },
  // Дмитрий — участник; «ОСАГО через 5 дней»
  largus: {
    brand: 'Lada',
    model: 'Largus',
    year: 2015,
    plateNumber: 'Е777КХ 50',
    vin: null,
    currentMileage: 154_300,
    owner: 'olga',
    members: ['dmitry'],
    entries: [],
    reminders: [
      {
        title: 'ОСАГО',
        triggerType: 'date',
        intervalMonths: 12,
        intervalKm: null,
        nextDueDate: '2026-10-15',
        nextDueMileage: null,
        category: null,
        lastEntry: null,
        isActive: true,
      },
    ],
  },
}

/** Итог записей Camry за 2026 год — контрольная сумма фикстуры. */
export const CAMRY_ENTRIES_TOTAL = 88_500
