import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import {
  initialLast,
  planReminderEdit,
  type ReminderEditSource,
  type ReminderEditValues,
} from '../utils/reminderEdit'

const context = { currentMileage: 87_450, today: '2026-10-10' }
const lastEntry = { date: '2025-10-10', mileage: 77_450 } as Entry

const withRecord: ReminderEditSource = {
  intervalKm: 10_000,
  intervalMonths: 12,
  nextDueDate: '2026-10-10',
  nextDueMileage: 87_450,
  lastEntry,
}
const withoutRecord: ReminderEditSource = { ...withRecord, lastEntry: null }

function valuesOf(source: ReminderEditSource, patch: Partial<ReminderEditValues> = {}) {
  return {
    intervalKm: source.intervalKm,
    intervalMonths: source.intervalMonths,
    ...initialLast(source),
    lastDate: source.lastEntry?.date ?? '',
    lastMileage: source.lastEntry?.mileage ?? null,
    lastTouched: false,
    ...patch,
  } satisfies ReminderEditValues
}

describe('initialLast', () => {
  it('берёт дату и пробег привязанной записи, иначе пусто', () => {
    expect(initialLast(withRecord)).toEqual({ date: '2025-10-10', mileage: 77_450 })
    expect(initialLast(withoutRecord)).toEqual({ date: '', mileage: null })
  })
})

describe('planReminderEdit', () => {
  it('ничего не менялось и записи нет — срок прежний, в запрос ничего не добавляется', () => {
    const plan = planReminderEdit(withoutRecord, valuesOf(withoutRecord), context)
    expect(plan.patch).toEqual({})
    expect(plan.due).toMatchObject({ nextDueDate: '2026-10-10', nextDueMileage: 87_450 })
    expect(plan.valid).toBe(true)
  })

  it('есть запись, «Последний раз» не трогали — пересчёт оставляем серверу', () => {
    const plan = planReminderEdit(withRecord, valuesOf(withRecord, { intervalKm: 15_000 }), context)
    expect(plan.patch).toEqual({})
    expect(plan.due).toMatchObject({ nextDueMileage: 92_450, nextDueDate: '2026-10-10' })
  })

  it('«Последний раз» правили — запись отвязывается, срок уходит явно', () => {
    const plan = planReminderEdit(
      withRecord,
      valuesOf(withRecord, { lastTouched: true, lastDate: '2026-01-15', lastMileage: 80_000 }),
      context,
    )
    expect(plan.patch).toEqual({
      lastEntryId: null,
      nextDueMileage: 90_000,
      nextDueDate: '2027-01-15',
    })
  })

  it('нет записи, интервал изменён — срок считается от сегодняшнего дня', () => {
    const plan = planReminderEdit(
      withoutRecord,
      valuesOf(withoutRecord, { intervalMonths: 6, intervalKm: null }),
      context,
    )
    expect(plan.patch).toEqual({
      lastEntryId: null,
      nextDueDate: '2027-04-10',
      nextDueMileage: null,
    })
  })

  it('убрали интервал — соответствующий срок обнуляется', () => {
    const plan = planReminderEdit(withRecord, valuesOf(withRecord, { intervalKm: null }), context)
    expect(plan.patch).toEqual({ nextDueMileage: null })
    expect(plan.due?.nextDueMileage).toBeNull()
    expect(plan.valid).toBe(true)
  })

  it('без интервалов и без срока сохранять нельзя', () => {
    const plan = planReminderEdit(
      withRecord,
      valuesOf(withRecord, { intervalKm: null, intervalMonths: null }),
      context,
    )
    expect(plan.due).toBeNull()
    expect(plan.valid).toBe(false)
  })

  it('разовое напоминание без интервала со сроком остаётся валидным и не теряет срок', () => {
    const oneOff: ReminderEditSource = {
      intervalKm: null,
      intervalMonths: null,
      nextDueDate: '2026-12-01',
      nextDueMileage: null,
      lastEntry: null,
    }
    const plan = planReminderEdit(oneOff, valuesOf(oneOff), context)
    expect(plan.patch).toEqual({})
    expect(plan.valid).toBe(true)
    expect(plan.due?.nextDueDate).toBe('2026-12-01')
  })
})
