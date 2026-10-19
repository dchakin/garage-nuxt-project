import { describe, expect, it } from 'vitest'
import { checkEntryMileage } from '../utils/entryMileageCheck'
import { NBSP } from '../utils/format'

const TODAY = '2026-10-10'
const CURRENT = 87_450

const entries = [
  { id: 1, date: '2026-03-01', mileage: 80_000 },
  { id: 2, date: '2026-06-15', mileage: 84_000 },
  { id: 3, date: '2026-09-12', mileage: 87_000 },
  { id: 4, date: '2026-09-20', mileage: null },
]

const check = (overrides: Partial<Parameters<typeof checkEntryMileage>[0]>) =>
  checkEntryMileage({
    mileage: CURRENT,
    date: TODAY,
    today: TODAY,
    currentMileage: CURRENT,
    entries,
    ...overrides,
  })

describe('checkEntryMileage — дата сегодня', () => {
  it('пробег меньше текущего — ошибка с текстом из макета Д3', () => {
    expect(check({ mileage: 8_745 })).toEqual({
      level: 'error',
      message: `Меньше текущего пробега (87${NBSP}450${NBSP}км). Похоже на опечатку — проверьте число. Для старой записи сначала смените дату.`,
    })
  })

  it('пробег равен текущему или больше — ок', () => {
    expect(check({ mileage: CURRENT })).toEqual({ level: 'ok' })
    expect(check({ mileage: CURRENT + 500 })).toEqual({ level: 'ok' })
  })

  it('пробег не указан — ок', () => {
    expect(check({ mileage: null })).toEqual({ level: 'ok' })
    expect(check({ mileage: undefined })).toEqual({ level: 'ok' })
  })

  it('дата в будущем проверяется как сегодняшняя', () => {
    expect(check({ mileage: 8_745, date: '2026-10-12' }).level).toBe('error')
  })
})

describe('checkEntryMileage — дата в прошлом', () => {
  it('пробег меньше текущего, но между соседями — ок', () => {
    expect(check({ mileage: 85_000, date: '2026-07-01' })).toEqual({ level: 'ok' })
  })

  it('меньше пробега предыдущей записи — предупреждение', () => {
    const result = check({ mileage: 83_000, date: '2026-07-01' })
    expect(result.level).toBe('warning')
    expect(result).toMatchObject({
      message: `Меньше, чем в записи от 15${NBSP}июн (84${NBSP}000${NBSP}км). Проверьте число.`,
    })
  })

  it('больше пробега следующей записи — предупреждение', () => {
    const result = check({ mileage: 88_000, date: '2026-07-01' })
    expect(result).toMatchObject({
      level: 'warning',
      message: `Больше, чем в записи от 12${NBSP}сент (87${NBSP}000${NBSP}км). Проверьте число.`,
    })
  })

  it('год показывается, если запись не из года «сегодня»', () => {
    const result = check({
      mileage: 100,
      date: '2026-01-01',
      entries: [{ date: '2025-12-30', mileage: 70_000 }],
    })
    expect(result).toMatchObject({ level: 'warning' })
    expect((result as { message: string }).message).toContain(`30${NBSP}дек${NBSP}2025`)
  })

  it('записи без пробега соседями не считаются', () => {
    expect(check({ mileage: 87_100, date: '2026-09-25' })).toEqual({ level: 'ok' })
  })

  it('самая ранняя запись: нет предыдущей — сверка только со следующей', () => {
    expect(check({ mileage: 10_000, date: '2026-01-01' })).toEqual({ level: 'ok' })
    expect(check({ mileage: 90_000, date: '2026-01-01' }).level).toBe('warning')
  })

  it('нет записей — ок', () => {
    expect(check({ mileage: 100, date: '2026-07-01', entries: [] })).toEqual({ level: 'ok' })
  })

  it('записи с той же датой в сверке не участвуют', () => {
    expect(check({ mileage: 79_000, date: '2026-03-01' }).level).toBe('ok')
  })

  it('из нескольких записей одного дня берётся самая строгая', () => {
    const sameDay = [
      { date: '2026-05-01', mileage: 82_000 },
      { date: '2026-05-01', mileage: 83_000 },
      { date: '2026-08-01', mileage: 86_000 },
      { date: '2026-08-01', mileage: 85_500 },
    ]
    expect(check({ mileage: 82_500, date: '2026-06-01', entries: sameDay }).level).toBe('warning')
    expect(check({ mileage: 85_800, date: '2026-06-01', entries: sameDay }).level).toBe('warning')
    expect(check({ mileage: 84_000, date: '2026-06-01', entries: sameDay }).level).toBe('ok')
  })

  it('правка записи: сама запись не считается соседом', () => {
    const edited = { mileage: 84_500, date: '2026-06-15', editingEntryId: 2 }
    expect(check({ ...edited, date: '2026-06-16' }).level).toBe('ok')
    expect(check({ mileage: 79_000, date: '2026-06-16', editingEntryId: 2 }).level).toBe('warning')
  })
})
