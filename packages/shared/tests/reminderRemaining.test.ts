import { describe, expect, it } from 'vitest'
import { NBSP } from '../utils/format'
import { averageKmPerMonth, formatReminderRemaining } from '../utils/reminderRemaining'

// Неразрывный пробел — внутри чисел, между числом и единицей и после «≈»
const nb = (text: string) => text.replace(/(?<=\d|≈) (?=\d|км|дн|день|мес)/g, NBSP)

// Эталонные данные (docs/plans/design-ux-fixes.md): Camry, 87 450 км, «сейчас» — 10 окт 2026
const TODAY = '2026-10-10'
const CURRENT_MILEAGE = 87_450

const camryEntryPoints: { date: string; mileage: number | null }[] = [
  { date: '2026-10-07', mileage: 87_450 },
  { date: '2026-09-25', mileage: 87_330 },
  { date: '2026-09-12', mileage: 87_200 },
  { date: '2026-08-03', mileage: 86_100 },
  { date: '2026-06-11', mileage: 84_000 },
  { date: '2026-05-02', mileage: 82_100 },
  { date: '2026-03-20', mileage: 79_800 },
  { date: '2026-02-14', mileage: 77_200 },
]

const base = {
  isActive: true,
  nextDueDate: null as string | null,
  nextDueMileage: null as number | null,
  intervalKm: null as number | null,
}

describe('averageKmPerMonth', () => {
  it('эталонная Camry: ≈ 1 280 км/мес', () => {
    expect(Math.round(averageKmPerMonth(camryEntryPoints)! / 10) * 10).toBe(1280)
  })

  it('не зависит от порядка и пропускает записи без пробега', () => {
    const shuffled = [...camryEntryPoints].reverse()
    shuffled.push({ date: '2026-01-01', mileage: null })
    expect(averageKmPerMonth(shuffled)).toBe(averageKmPerMonth(camryEntryPoints))
  })

  it('null, если данных мало', () => {
    expect(averageKmPerMonth([])).toBeNull()
    expect(averageKmPerMonth([{ date: '2026-01-01', mileage: 1000 }])).toBeNull()
    // в пределах одного месяца
    expect(
      averageKmPerMonth([
        { date: '2026-01-01', mileage: 1000 },
        { date: '2026-01-07', mileage: 1500 },
      ]),
    ).toBeNull()
  })
})

describe('formatReminderRemaining: эталонные напоминания', () => {
  const avgKmPerMonth = averageKmPerMonth(camryEntryPoints)
  const ctx = { currentMileage: CURRENT_MILEAGE, today: TODAY, avgKmPerMonth }

  it('Замена масла: просрочено по пробегу, хотя по дате ещё рано', () => {
    const oil = { ...base, intervalKm: 10_000, nextDueDate: '2027-02-14', nextDueMileage: 87_200 }
    expect(formatReminderRemaining(oil, ctx)).toBe(nb('Просрочено на 250 км'))
  })

  it('Техосмотр: просрочено на 39 дней', () => {
    expect(formatReminderRemaining({ ...base, nextDueDate: '2026-09-01' }, ctx)).toBe(
      nb('Просрочено на 39 дней'),
    )
  })

  it('ОСАГО: через 8 дней', () => {
    expect(formatReminderRemaining({ ...base, nextDueDate: '2026-10-18' }, ctx)).toBe(
      nb('Через 8 дней'),
    )
  })

  it('Замена ГРМ: через 12 550 км, ≈ 10 мес', () => {
    const timing = { ...base, intervalKm: 100_000, nextDueMileage: 100_000 }
    expect(formatReminderRemaining(timing, ctx)).toBe(nb('Через 12 550 км, ≈ 10 мес'))
  })

  it('Сезонная смена шин: выключено', () => {
    expect(
      formatReminderRemaining({ ...base, isActive: false, nextDueDate: '2026-11-02' }, ctx),
    ).toBe('Выключено')
  })

  it('Lada Largus, ОСАГО: через 5 дней', () => {
    expect(formatReminderRemaining({ ...base, nextDueDate: '2026-10-15' }, ctx)).toBe(
      nb('Через 5 дней'),
    )
  })
})

describe('formatReminderRemaining: прочие случаи', () => {
  const ctx = { currentMileage: 10_000, today: TODAY }

  it('через 750 км: без среднего пробега оценки нет', () => {
    expect(formatReminderRemaining({ ...base, nextDueMileage: 10_750 }, ctx)).toBe(
      nb('Через 750 км'),
    )
  })

  it('меньше месяца езды: без оценки в месяцах', () => {
    const reminder = { ...base, nextDueMileage: 10_750 }
    expect(formatReminderRemaining(reminder, { ...ctx, avgKmPerMonth: 1280 })).toBe(
      nb('Через 750 км'),
    )
  })

  it.each([
    ['2026-10-09', 'Просрочено на 1 день'],
    ['2026-10-07', 'Просрочено на 3 дня'],
    ['2026-09-19', 'Просрочено на 21 день'],
    ['2026-10-11', 'Через 1 день'],
    ['2026-10-12', 'Через 2 дня'],
    ['2026-10-10', 'Сегодня'],
  ])('дата %s → %s', (nextDueDate, expected) => {
    expect(formatReminderRemaining({ ...base, nextDueDate }, ctx)).toBe(nb(expected))
  })

  it('срок по пробегу наступил ровно сейчас', () => {
    expect(formatReminderRemaining({ ...base, nextDueMileage: 10_000 }, ctx)).toBe('Пора')
  })

  it('оба условия в норме: показывается то, что наступит раньше', () => {
    const reminder = { ...base, nextDueDate: '2027-10-10', nextDueMileage: 15_000 }
    // 5 000 км при 1 000 км/мес — 5 мес, раньше года
    expect(formatReminderRemaining(reminder, { ...ctx, avgKmPerMonth: 1000 })).toBe(
      nb('Через 5 000 км, ≈ 5 мес'),
    )
    // 5 000 км при 100 км/мес — 50 мес, дата раньше
    expect(formatReminderRemaining(reminder, { ...ctx, avgKmPerMonth: 100 })).toBe(
      nb('Через 365 дней'),
    )
    // без среднего пробега — дата
    expect(formatReminderRemaining(reminder, ctx)).toBe(nb('Через 365 дней'))
  })

  it('«скоро» по пробегу важнее «ок» по дате', () => {
    const reminder = { ...base, nextDueDate: '2027-10-10', nextDueMileage: 10_300 }
    expect(formatReminderRemaining(reminder, ctx)).toBe(nb('Через 300 км'))
  })

  it('без срока', () => {
    expect(formatReminderRemaining(base, ctx)).toBe('Срок не задан')
  })
})
