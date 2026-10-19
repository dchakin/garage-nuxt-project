import { describe, expect, it } from 'vitest'
import { describeNextDue, formatReminderShifted, previewNextDue } from '../utils/reminderNextDue'

const NBSP = ' '
const oilChange = {
  triggerType: 'both' as const,
  intervalKm: 10_000,
  intervalMonths: 12,
  nextDueDate: '2027-02-14',
  nextDueMileage: 87_200,
}

describe('previewNextDue', () => {
  it('считает срок от записи по обоим интервалам', () => {
    expect(previewNextDue(oilChange, { date: '2026-10-10', mileage: 87_450 })).toEqual({
      nextDueDate: '2027-10-10',
      nextDueMileage: 97_450,
    })
  })

  it('без пробега записи оставляет прежний срок по км', () => {
    expect(previewNextDue(oilChange, { date: '2026-10-10', mileage: null })).toEqual({
      nextDueDate: '2027-10-10',
      nextDueMileage: 87_200,
    })
  })

  it('не выдумывает условие, которого у напоминания нет', () => {
    const byDate = { ...oilChange, triggerType: 'date' as const, intervalKm: null }
    expect(
      previewNextDue(byDate, { date: '2026-10-10', mileage: 87_450 }).nextDueMileage,
    ).toBeNull()
  })
})

describe('describeNextDue', () => {
  it('пробег и дата через «или»', () => {
    const nextDue = { nextDueDate: '2027-10-10', nextDueMileage: 97_450 }
    expect(describeNextDue(nextDue, '2026-10-10')).toBe(
      `на 97${NBSP}450${NBSP}км или 10${NBSP}окт${NBSP}2027`,
    )
  })

  it('срок не задан → null', () => {
    expect(describeNextDue({ nextDueDate: null, nextDueMileage: null })).toBeNull()
  })
})

describe('formatReminderShifted', () => {
  it('«Замена…» → «следующая замена на … км»', () => {
    const reminder = { title: 'Замена масла', nextDueDate: '2027-10-10', nextDueMileage: 97_450 }
    expect(formatReminderShifted(reminder, '2026-10-10')).toBe(
      `Срок сдвинут: следующая замена на 97${NBSP}450${NBSP}км`,
    )
  })

  it('другое название и только дата', () => {
    const reminder = { title: 'ОСАГО', nextDueDate: '2027-10-15', nextDueMileage: null }
    expect(formatReminderShifted(reminder, '2026-10-10')).toBe(
      `Срок сдвинут: следующий срок на 15${NBSP}окт${NBSP}2027`,
    )
  })
})
