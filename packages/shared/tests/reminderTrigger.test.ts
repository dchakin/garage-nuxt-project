import { describe, expect, it } from 'vitest'
import { deriveTriggerType } from '../utils/reminderTrigger'

describe('deriveTriggerType', () => {
  it('только месяцы → date', () => {
    expect(deriveTriggerType({ intervalMonths: 12 })).toBe('date')
  })

  it('только км → mileage', () => {
    expect(deriveTriggerType({ intervalKm: 10000, intervalMonths: null })).toBe('mileage')
  })

  it('оба интервала → both', () => {
    expect(deriveTriggerType({ intervalKm: 10000, intervalMonths: 12 })).toBe('both')
  })

  it('без интервалов опирается на явные сроки', () => {
    expect(deriveTriggerType({ nextDueMileage: 90000 })).toBe('mileage')
    expect(deriveTriggerType({ nextDueDate: '2026-12-01', nextDueMileage: 0 })).toBe('both')
  })

  it('без условий → date', () => {
    expect(deriveTriggerType({})).toBe('date')
  })
})
