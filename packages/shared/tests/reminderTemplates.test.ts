import { describe, expect, it } from 'vitest'
import {
  findLastEntryInCategory,
  findReminderByTitle,
  reminderTemplates,
} from '../utils/reminderTemplates'
import { previewReminderDue } from '../utils/reminderPreview'

describe('reminderTemplates', () => {
  it('содержит масло, ОСАГО, техосмотр, ГРМ и шины с уникальными id и названиями', () => {
    expect(reminderTemplates.map((template) => template.id)).toEqual([
      'oil',
      'osago',
      'inspection',
      'timing-belt',
      'tires',
    ])
    expect(new Set(reminderTemplates.map((template) => template.title)).size).toBe(
      reminderTemplates.length,
    )
  })

  it('у каждого шаблона есть хотя бы один интервал, категория — имя или null', () => {
    for (const template of reminderTemplates) {
      expect(template.intervalKm || template.intervalMonths).toBeTruthy()
      expect(template.categoryName).not.toBe('')
    }
    expect(reminderTemplates.find((template) => template.id === 'oil')?.categoryName).toBe(
      'Масло и фильтры',
    )
  })
})

describe('findReminderByTitle', () => {
  const reminders = [{ title: 'Замена масла' }, { title: 'ОСАГО' }]

  it('находит напоминание без учёта регистра и лишних пробелов', () => {
    expect(findReminderByTitle(reminders, '  осаго ')).toBe(reminders[1])
    expect(findReminderByTitle(reminders, 'замена  МАСЛА')).toBe(reminders[0])
  })

  it('не находит другое название и пустое', () => {
    expect(findReminderByTitle(reminders, 'Замена ГРМ')).toBeUndefined()
    expect(findReminderByTitle(reminders, '   ')).toBeUndefined()
  })
})

describe('findLastEntryInCategory', () => {
  const entries = [
    { id: 1, date: '2026-03-01', categoryId: 5 },
    { id: 2, date: '2026-09-12', categoryId: 5 },
    { id: 3, date: '2026-10-01', categoryId: 6 },
    { id: 4, date: '2026-09-12', categoryId: 5 },
    { id: 5, date: '2026-10-05', categoryId: null },
  ]

  it('берёт самую свежую запись категории, при равных датах — последнюю созданную', () => {
    expect(findLastEntryInCategory(entries, 5)?.id).toBe(4)
  })

  it('без категории или без записей в ней — ничего', () => {
    expect(findLastEntryInCategory(entries, null)).toBeUndefined()
    expect(findLastEntryInCategory(entries, 99)).toBeUndefined()
  })
})

describe('previewReminderDue', () => {
  const base = {
    intervalKm: 10_000,
    intervalMonths: 12,
    last: { date: '2026-09-12', mileage: 87_450 },
    currentMileage: 88_000,
    today: '2026-10-10',
  }

  it('считает срок от последнего раза по обоим интервалам', () => {
    expect(previewReminderDue(base)).toEqual({
      nextDueDate: '2027-09-12',
      nextDueMileage: 97_450,
      isOverdue: false,
    })
  })

  it('пустой «последний раз» — от сегодня и текущего пробега', () => {
    expect(previewReminderDue({ ...base, last: { date: null, mileage: null } })).toMatchObject({
      nextDueDate: '2027-10-10',
      nextDueMileage: 98_000,
    })
  })

  it('срок позади — isOverdue', () => {
    const preview = previewReminderDue({
      ...base,
      intervalKm: null,
      last: { date: '2025-01-10', mileage: null },
    })
    expect(preview).toMatchObject({ nextDueDate: '2026-01-10', nextDueMileage: null })
    expect(preview?.isOverdue).toBe(true)
  })

  it('пробег уже превышен — isOverdue', () => {
    const preview = previewReminderDue({
      ...base,
      intervalMonths: null,
      last: { date: '2026-01-01', mileage: 70_000 },
    })
    expect(preview).toMatchObject({ nextDueDate: null, nextDueMileage: 80_000, isOverdue: true })
  })

  it('без интервалов предпросмотра нет', () => {
    expect(previewReminderDue({ ...base, intervalKm: null, intervalMonths: null })).toBeNull()
  })
})
