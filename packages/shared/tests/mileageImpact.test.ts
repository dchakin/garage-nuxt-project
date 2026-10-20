import { describe, expect, it } from 'vitest'
import { NBSP } from '../utils/format'
import { describeMileageChange, diffReminderStatuses } from '../utils/mileageImpact'

const TODAY = '2026-10-10'
const MILEAGE = 87_450

const reminder = (
  id: number,
  overrides: Partial<Parameters<typeof diffReminderStatuses>[0][number]>,
) => ({
  id,
  title: `Напоминание ${id}`,
  isActive: true,
  nextDueDate: null as string | null,
  nextDueMileage: null as number | null,
  intervalKm: null as number | null,
  ...overrides,
})

// Как в эталонных данных Camry
const oil = reminder(1, { title: 'Замена масла', nextDueMileage: 87_200, intervalKm: 10_000 })
const inspection = reminder(2, { title: 'Техосмотр', nextDueDate: '2026-09-01' })
const timing = reminder(4, { title: 'Замена ГРМ', nextDueMileage: 100_000, intervalKm: 100_000 })
const tires = reminder(5, {
  title: 'Шины',
  isActive: false,
  nextDueMileage: 88_000,
  intervalKm: 10_000,
})
const camry = [oil, inspection, timing, tires]

describe('diffReminderStatuses', () => {
  it('просроченное остаётся просроченным: остаток меняется, push не будет', () => {
    const impact = diffReminderStatuses([oil], MILEAGE, 87_950, TODAY)
    expect(impact.willPush).toBe(false)
    expect(impact.changes).toHaveLength(1)
    expect(impact.changes[0]).toMatchObject({
      statusBefore: 'overdue',
      statusAfter: 'overdue',
      kmLeftBefore: -250,
      kmLeftAfter: -750,
      willPush: false,
    })
  })

  it('учитывает только включённые напоминания с условием по пробегу', () => {
    const impact = diffReminderStatuses(camry, MILEAGE, 90_500, TODAY)
    expect(impact.changes.map((change) => change.reminder.id)).toEqual([1, 4])
  })

  it('«в порядке» → «в порядке» не считается изменением', () => {
    const impact = diffReminderStatuses(camry, MILEAGE, 87_950, TODAY)
    expect(impact.changes.map((change) => change.reminder.id)).toEqual([1])
  })

  it('переход в «скоро» даёт push', () => {
    const impact = diffReminderStatuses([timing], MILEAGE, 90_500, TODAY)
    expect(impact.changes[0]).toMatchObject({ statusBefore: 'ok', statusAfter: 'soon' })
    expect(impact.willPush).toBe(true)
  })

  it('переход в «просрочено» из «скоро» и из «в порядке» даёт push', () => {
    expect(diffReminderStatuses([timing], 95_000, 100_500, TODAY).willPush).toBe(true)
    expect(diffReminderStatuses([timing], MILEAGE, 101_000, TODAY).willPush).toBe(true)
  })

  it('уменьшение пробега (из «просрочено» в «в порядке») — без push', () => {
    const impact = diffReminderStatuses([oil], MILEAGE, 78_450, TODAY)
    expect(impact.changes[0]).toMatchObject({ statusBefore: 'overdue', statusAfter: 'ok' })
    expect(impact.willPush).toBe(false)
  })

  it('пробег не изменился — изменений нет', () => {
    expect(diffReminderStatuses(camry, MILEAGE, MILEAGE, TODAY)).toEqual({
      changes: [],
      willPush: false,
    })
  })

  it('нет напоминаний с пробегом — блока не будет', () => {
    expect(diffReminderStatuses([inspection], MILEAGE, 90_000, TODAY).changes).toEqual([])
  })
})

describe('describeMileageChange', () => {
  it('просрочено сильнее — «просрочено уже на … а не на …»', () => {
    const [grown] = diffReminderStatuses([oil], MILEAGE, 87_912, TODAY).changes
    expect(describeMileageChange(grown)).toBe(
      `Замена масла: просрочено уже на 712${NBSP}км, а не на 250${NBSP}км`,
    )
  })

  it('остаток до срока и прежнее значение', () => {
    const [change] = diffReminderStatuses([timing], MILEAGE, 90_500, TODAY).changes
    expect(describeMileageChange(change)).toBe(
      `Замена ГРМ: через 9${NBSP}500${NBSP}км, было через 12${NBSP}550${NBSP}км`,
    )
  })
})
