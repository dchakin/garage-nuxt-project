import { describe, expect, it } from 'vitest'
import {
  ATTENTION_LIMIT,
  countAttentionReminders,
  countRemindersByStatus,
  pickAttentionReminders,
} from '../utils/reminderBadge'

const TODAY = '2026-10-10'
const MILEAGE = 87_450

const reminder = (overrides: Partial<Parameters<typeof countAttentionReminders>[0][number]>) => ({
  isActive: true,
  nextDueDate: null as string | null,
  nextDueMileage: null as number | null,
  intervalKm: null as number | null,
  ...overrides,
})

// Как в эталонных данных Camry: 2 просрочено, 1 скоро, 1 в порядке, 1 выключено
const camryReminders = [
  reminder({ nextDueMileage: 87_200, intervalKm: 10_000 }),
  reminder({ nextDueDate: '2026-09-01' }),
  reminder({ nextDueDate: '2026-10-18' }),
  reminder({ nextDueMileage: 100_000, intervalKm: 60_000 }),
  reminder({ isActive: false, nextDueDate: '2026-01-01' }),
]

describe('countRemindersByStatus', () => {
  it('раскладывает напоминания по статусам', () => {
    expect(countRemindersByStatus(camryReminders, MILEAGE, TODAY)).toEqual({
      overdue: 2,
      soon: 1,
      ok: 1,
      inactive: 1,
    })
  })

  it('пустой список — все нули', () => {
    expect(countRemindersByStatus([], MILEAGE, TODAY)).toEqual({
      overdue: 0,
      soon: 0,
      ok: 0,
      inactive: 0,
    })
  })
})

describe('countAttentionReminders', () => {
  it('просроченные + скорые', () => {
    expect(countAttentionReminders(camryReminders, MILEAGE, TODAY)).toBe(3)
  })

  it('выключенное просроченное не считается', () => {
    const reminders = [reminder({ isActive: false, nextDueMileage: 1_000 })]
    expect(countAttentionReminders(reminders, MILEAGE, TODAY)).toBe(0)
  })

  it('всё в порядке — 0', () => {
    const reminders = [reminder({ nextDueDate: '2027-01-01' })]
    expect(countAttentionReminders(reminders, MILEAGE, TODAY)).toBe(0)
  })
})

describe('pickAttentionReminders', () => {
  it('просроченные раньше скорых, выключенные и «в порядке» отброшены', () => {
    const [overdueMileage, overdueDate, soon] = camryReminders
    // «скоро» стоит первым в исходном списке — в результате всё равно последним
    const picked = pickAttentionReminders([soon, ...camryReminders], MILEAGE, TODAY)
    expect(picked).toEqual([overdueMileage, overdueDate, soon])
  })

  it('не больше лимита', () => {
    const many = Array.from({ length: 5 }, () => reminder({ nextDueDate: '2026-09-01' }))
    expect(pickAttentionReminders(many, MILEAGE, TODAY)).toHaveLength(ATTENTION_LIMIT)
    expect(pickAttentionReminders(many, MILEAGE, TODAY, 2)).toHaveLength(2)
  })

  it('нечего показывать — пустой список', () => {
    expect(pickAttentionReminders([], MILEAGE, TODAY)).toEqual([])
    expect(
      pickAttentionReminders([reminder({ nextDueDate: '2027-01-01' })], MILEAGE, TODAY),
    ).toEqual([])
  })
})
