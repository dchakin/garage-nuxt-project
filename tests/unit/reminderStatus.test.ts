import { describe, expect, it } from 'vitest'
import { getReminderStatus } from '../../shared/utils/reminderStatus'

const base = {
  isActive: true,
  nextDueDate: null as string | null,
  nextDueMileage: null as number | null,
  intervalKm: null as number | null
}

describe('getReminderStatus', () => {
  it('неактивное напоминание всегда inactive', () => {
    expect(getReminderStatus({ ...base, isActive: false, nextDueDate: '2020-01-01' }, 0)).toBe('inactive')
  })

  it('просрочено по дате', () => {
    const status = getReminderStatus({ ...base, nextDueDate: '2026-01-01' }, 0, '2026-01-02')
    expect(status).toBe('overdue')
  })

  it('скоро по дате (в пределах 14 дней)', () => {
    const status = getReminderStatus({ ...base, nextDueDate: '2026-01-15' }, 0, '2026-01-01')
    expect(status).toBe('soon')
  })

  it('ок по дате (больше 14 дней)', () => {
    const status = getReminderStatus({ ...base, nextDueDate: '2026-02-01' }, 0, '2026-01-01')
    expect(status).toBe('ok')
  })

  it('просрочено по пробегу', () => {
    const status = getReminderStatus({ ...base, nextDueMileage: 90000 }, 90500)
    expect(status).toBe('overdue')
  })

  it('скоро по пробегу — использует fallback 500 км без intervalKm', () => {
    expect(getReminderStatus({ ...base, nextDueMileage: 90000 }, 89600)).toBe('soon')
    expect(getReminderStatus({ ...base, nextDueMileage: 90000 }, 89000)).toBe('ok')
  })

  it('скоро по пробегу — 10% от интервала, если он больше fallback', () => {
    // intervalKm=10000 -> порог "скоро" = 1000 км
    expect(getReminderStatus({ ...base, nextDueMileage: 90000, intervalKm: 10000 }, 89100)).toBe('soon')
    expect(getReminderStatus({ ...base, nextDueMileage: 90000, intervalKm: 10000 }, 88900)).toBe('ok')
  })

  it('при обоих условиях берётся более срочный статус', () => {
    // дата "ок", пробег "просрочено"
    const status = getReminderStatus(
      { ...base, nextDueDate: '2026-06-01', nextDueMileage: 90000 },
      91000,
      '2026-01-01'
    )
    expect(status).toBe('overdue')
  })

  it('без заданных дат/пробега считается ok', () => {
    expect(getReminderStatus(base, 1000)).toBe('ok')
  })
})
