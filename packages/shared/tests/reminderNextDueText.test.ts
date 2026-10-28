import { describe, expect, it } from 'vitest'
import {
  describeLastPoint,
  describeLastSource,
  describeUpcomingDue,
} from '../utils/reminderNextDue'

const TODAY = '2026-10-10'

describe('describeLastPoint', () => {
  it('склеивает дату и пробег, пустое — null', () => {
    expect(describeLastPoint({ date: '2026-02-14', mileage: 77_200 }, TODAY)).toMatch(
      /^14\sфев · 77\s200\sкм$/,
    )
    expect(describeLastPoint({ date: null, mileage: 5000 }, TODAY)).toMatch(/^5\s000\sкм$/)
    expect(describeLastPoint({ date: null, mileage: null }, TODAY)).toBeNull()
  })
})

describe('describeLastSource', () => {
  const last = { date: '2026-02-14', mileage: 77_200 }

  it('из журнала, с пометкой записи', () => {
    expect(
      describeLastSource(last, { fromJournal: true, today: TODAY, note: 'Летняя резина' }),
    ).toMatch(/^Из журнала: 14\sфев · 77\s200\sкм \(Летняя резина\)$/)
  })

  it('введено руками — «Указано», без данных — отсчёт с сегодня', () => {
    expect(describeLastSource(last, { fromJournal: false, today: TODAY })).toMatch(/^Указано: /)
    expect(
      describeLastSource({ date: null, mileage: null }, { fromJournal: true, today: TODAY }),
    ).toBe('Из журнала не найдено — отсчёт с сегодня')
  })
})

describe('describeUpcomingDue', () => {
  const nextDue = { nextDueDate: '2026-11-02', nextDueMileage: null }

  it('один интервал в месяцах — формула «дата + N мес»', () => {
    expect(
      describeUpcomingDue(
        {
          nextDue,
          intervalKm: null,
          intervalMonths: 6,
          last: { date: '2026-05-02', mileage: null },
        },
        TODAY,
      ),
    ).toMatch(/^Следующее — 2\sнояб: 2\sмая \+ 6\sмес\.$/)
  })

  it('два интервала — только срок; нет срока — null', () => {
    expect(
      describeUpcomingDue(
        {
          nextDue: { nextDueDate: '2027-02-14', nextDueMileage: 87_200 },
          intervalKm: 10_000,
          intervalMonths: 12,
          last: { date: '2026-02-14', mileage: 77_200 },
        },
        TODAY,
      ),
    ).toMatch(/^Следующее — 87\s200\sкм или 14\sфев\s2027\.$/)
    expect(
      describeUpcomingDue(
        {
          nextDue: { nextDueDate: null, nextDueMileage: null },
          intervalKm: null,
          intervalMonths: null,
          last: { date: null, mileage: null },
        },
        TODAY,
      ),
    ).toBeNull()
  })
})
