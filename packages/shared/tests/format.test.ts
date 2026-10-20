import { describe, expect, it } from 'vitest'
import {
  formatCompactAmount,
  formatCostPerKm,
  formatDate,
  formatDays,
  formatMileage,
  formatMoney,
  formatMonthYear,
  formatNumber,
  formatTime,
  NBSP,
  pluralize,
  todayIso,
} from '../utils/format'

// В ожиданиях пробел обычный, `nb()` превращает его в неразрывный
const nb = (text: string) => text.replaceAll(' ', NBSP)
const TODAY = '2026-10-10'

describe('formatCostPerKm', () => {
  it('рубли за километр с одной цифрой после запятой', () => {
    expect(formatCostPerKm(8.6)).toBe(nb('8,6 ₽/км'))
    expect(formatCostPerKm(12)).toBe(nb('12,0 ₽/км'))
    expect(formatCostPerKm(0)).toBe(nb('0,0 ₽/км'))
  })
})

describe('formatMonthYear', () => {
  it('месяц и год с заглавной буквы', () => {
    expect(formatMonthYear('2026-09')).toBe('Сентябрь 2026')
    expect(formatMonthYear('2025-01')).toBe('Январь 2025')
    expect(formatMonthYear('2026-12')).toBe('Декабрь 2026')
  })

  it('принимает полную дату', () => {
    expect(formatMonthYear('2026-05-02')).toBe('Май 2026')
  })
})

describe('formatTime', () => {
  it('часы без ведущего нуля, минуты с нулём', () => {
    expect(formatTime(new Date(2026, 9, 10, 9, 12))).toBe('9:12')
    expect(formatTime(new Date(2026, 9, 10, 14, 5))).toBe('14:05')
    expect(formatTime(new Date(2026, 9, 10, 0, 0))).toBe('0:00')
  })
})

describe('formatNumber', () => {
  it('группирует разряды неразрывным пробелом', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1000)).toBe(nb('1 000'))
    expect(formatNumber(1234567)).toBe(nb('1 234 567'))
  })

  it('дробная часть через запятую, округление', () => {
    expect(formatNumber(8.62, 1)).toBe('8,6')
    expect(formatNumber(6800.4)).toBe(nb('6 800'))
    expect(formatNumber(-1500)).toBe(nb('−1 500'))
  })
})

describe('formatMoney / formatMileage', () => {
  it.each([
    [6800, '6 800 ₽'],
    [1200, '1 200 ₽'],
    [48600, '48 600 ₽'],
    [88500, '88 500 ₽'],
    [9800, '9 800 ₽'],
  ])('formatMoney(%i) → %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(nb(expected))
  })

  it.each([
    [87450, '87 450 км'],
    [77200, '77 200 км'],
    [154300, '154 300 км'],
    [750, '750 км'],
  ])('formatMileage(%i) → %s', (km, expected) => {
    expect(formatMileage(km)).toBe(nb(expected))
  })
})

describe('formatDate', () => {
  it.each([
    ['2026-10-07', '7 окт'],
    ['2026-10-10', '10 окт'],
    ['2026-09-25', '25 сент'],
    ['2026-09-12', '12 сент'],
    ['2026-08-03', '3 авг'],
    ['2026-06-11', '11 июн'],
    ['2026-05-02', '2 мая'],
    ['2026-03-20', '20 мар'],
    ['2026-02-14', '14 фев'],
    ['2026-01-01', '1 янв'],
    ['2026-04-30', '30 апр'],
    ['2026-07-15', '15 июл'],
    ['2026-11-02', '2 нояб'],
    ['2026-12-31', '31 дек'],
  ])('%s в текущем году → %s', (date, expected) => {
    expect(formatDate(date, TODAY)).toBe(nb(expected))
  })

  it('год показывается, только если он не текущий', () => {
    expect(formatDate('2027-02-14', TODAY)).toBe(nb('14 фев 2027'))
    expect(formatDate('2025-12-31', TODAY)).toBe(nb('31 дек 2025'))
  })

  it('принимает дату-время ISO', () => {
    expect(formatDate('2026-10-07T12:00:00.000Z', TODAY)).toBe(nb('7 окт'))
  })
})

describe('pluralize / formatDays', () => {
  it.each([
    [1, 'день'],
    [21, 'день'],
    [101, 'день'],
    [2, 'дня'],
    [4, 'дня'],
    [22, 'дня'],
    [5, 'дней'],
    [8, 'дней'],
    [11, 'дней'],
    [12, 'дней'],
    [14, 'дней'],
    [39, 'дней'],
    [111, 'дней'],
    [0, 'дней'],
  ])('%i → %s', (count, form) => {
    expect(pluralize(count, ['день', 'дня', 'дней'])).toBe(form)
    expect(formatDays(count)).toBe(`${count}${NBSP}${form}`)
  })
})

describe('todayIso', () => {
  it('берёт локальную дату', () => {
    expect(todayIso(new Date(2026, 9, 10, 9, 41))).toBe('2026-10-10')
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatCompactAmount', () => {
  it.each([
    [48600, `48,6${NBSP}т`],
    [12200, `12,2${NBSP}т`],
    [12000, `12${NBSP}т`],
    [1250000, `1,3${NBSP}млн`],
    [800, '800'],
    [0, '0'],
  ])('%d → %s', (amount, expected) => {
    expect(formatCompactAmount(amount)).toBe(expected)
  })
})
