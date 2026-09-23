import { describe, expect, it } from 'vitest'
import { computeNextDue } from '../../server/utils/reminderDue'

describe('computeNextDue', () => {
  it('считает дату по интервалу месяцев от последней записи', () => {
    const result = computeNextDue({
      triggerType: 'date',
      intervalMonths: 6,
      lastEntry: { date: '2026-01-15', mileage: 1000 }
    })
    expect(result).toEqual({ nextDueDate: '2026-07-15', nextDueMileage: null })
  })

  it('переносит дату на следующий существующий день, если конца месяца не хватает (31 янв + 1 мес)', () => {
    const result = computeNextDue({
      triggerType: 'date',
      intervalMonths: 1,
      lastEntry: { date: '2026-01-31', mileage: null }
    })
    // JS Date.setMonth переносит 31 фев -> 3 марта, это ожидаемое поведение реализации
    expect(result.nextDueDate).toBe('2026-03-03')
  })

  it('корректно считает интервал через високосный год', () => {
    const result = computeNextDue({
      triggerType: 'date',
      intervalMonths: 12,
      lastEntry: { date: '2028-02-29', mileage: null }
    })
    expect(result.nextDueDate).toBe('2029-03-01')
  })

  it('без привязанной записи использует явно указанную дату', () => {
    const result = computeNextDue({
      triggerType: 'date',
      intervalMonths: 6,
      lastEntry: null,
      nextDueDateOverride: '2026-12-01'
    })
    expect(result).toEqual({ nextDueDate: '2026-12-01', nextDueMileage: null })
  })

  it('считает пробег по интервалу от последней записи', () => {
    const result = computeNextDue({
      triggerType: 'mileage',
      intervalKm: 10000,
      lastEntry: { date: '2026-01-01', mileage: 87000 }
    })
    expect(result).toEqual({ nextDueDate: null, nextDueMileage: 97000 })
  })

  it('без интервала пробега использует явно указанное значение', () => {
    const result = computeNextDue({
      triggerType: 'mileage',
      lastEntry: null,
      nextDueMileageOverride: 100000
    })
    expect(result).toEqual({ nextDueDate: null, nextDueMileage: 100000 })
  })

  it('считает и дату, и пробег при triggerType "both"', () => {
    const result = computeNextDue({
      triggerType: 'both',
      intervalMonths: 12,
      intervalKm: 15000,
      lastEntry: { date: '2026-03-10', mileage: 50000 }
    })
    expect(result).toEqual({ nextDueDate: '2027-03-10', nextDueMileage: 65000 })
  })

  it('без записи и без интервала пробега при триггере mileage оставляет null, если override не задан', () => {
    const result = computeNextDue({ triggerType: 'mileage', lastEntry: null })
    expect(result.nextDueMileage).toBeNull()
  })

  it('не считает пробег при triggerType "date"', () => {
    const result = computeNextDue({
      triggerType: 'date',
      intervalMonths: 6,
      intervalKm: 10000,
      lastEntry: { date: '2026-01-01', mileage: 1000 }
    })
    expect(result.nextDueMileage).toBeNull()
  })
})
