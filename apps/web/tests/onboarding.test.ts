import { describe, expect, it } from 'vitest'
import { NBSP } from '@garage/shared/utils/format'
import { reminderTemplates, type ReminderTemplateId } from '@garage/shared/utils/reminderTemplates'
import { buildCarInput, createCarStepValues, parseCarYear } from '~/utils/onboardingCar'
import {
  buildOnboardingReminders,
  countEnabledDrafts,
  createTemplateDrafts,
  describeTemplateRule,
  nextTireSwap,
} from '~/utils/onboardingReminders'

const categories = new Map([
  ['Масло и фильтры', 11],
  ['Двигатель', 12],
])

describe('onboardingCar', () => {
  it('год: пусто — null, корректный — число, мусор и выход за диапазон — NaN', () => {
    expect(parseCarYear('')).toBeNull()
    expect(parseCarYear(' 2018 ')).toBe(2018)
    expect(parseCarYear('18')).toBeNaN()
    expect(parseCarYear('abcd')).toBeNaN()
    expect(parseCarYear('3000')).toBeNaN()
  })

  it('тело POST /api/cars: обрезает пробелы, пустой номер и год — null', () => {
    const input = buildCarInput({
      ...createCarStepValues(),
      brand: ' Toyota ',
      model: 'Camry',
      currentMileage: 87_450,
    })
    expect(input).toEqual({
      brand: 'Toyota',
      model: 'Camry',
      year: null,
      plateNumber: null,
      currentMileage: 87_450,
    })
  })
})

describe('onboardingReminders', () => {
  it('по умолчанию включены масло, ОСАГО и техосмотр', () => {
    const drafts = createTemplateDrafts()
    expect(countEnabledDrafts(drafts)).toBe(3)
    expect(drafts.oil.enabled).toBe(true)
    expect(drafts['timing-belt'].enabled).toBe(false)
  })

  it('без введённых данных «последний раз» не передаётся — сервер считает от сегодня', () => {
    const items = buildOnboardingReminders(createTemplateDrafts(), categories)
    expect(items.map((item) => item.title)).toEqual(['Замена масла', 'ОСАГО', 'Техосмотр'])
    expect(items[0]).toEqual({
      title: 'Замена масла',
      intervalKm: 10_000,
      intervalMonths: 12,
      categoryId: 11,
    })
    expect(items.every((item) => !item.last && !item.nextDueDate)).toBe(true)
  })

  it('«когда меняли» уходит в last, «Полис действует до» — в nextDueDate', () => {
    const drafts = createTemplateDrafts()
    drafts.oil.lastDate = '2025-03-01'
    drafts.oil.lastMileage = 70_000
    drafts.osago.validUntil = '2027-06-30'
    drafts.osago.lastDate = '2020-01-01'

    const [oil, osago] = buildOnboardingReminders(drafts, categories)
    expect(oil.last).toEqual({ date: '2025-03-01', mileage: 70_000 })
    expect(osago.nextDueDate).toBe('2027-06-30')
    expect(osago.last).toBeUndefined()
    expect(osago.categoryId).toBeNull()
  })

  it('только пробег при замене — last без даты; выключенные шаблоны пропускаются', () => {
    const drafts = createTemplateDrafts()
    drafts.oil.lastMileage = 70_000
    drafts.osago.enabled = false
    drafts.inspection.enabled = false
    drafts['timing-belt'].enabled = true

    const items = buildOnboardingReminders(drafts, categories)
    expect(items.map((item) => item.title)).toEqual(['Замена масла', 'Замена ГРМ'])
    expect(items[0].last).toEqual({ date: null, mileage: 70_000 })
    expect(items[1].categoryId).toBe(12)
  })

  it('нет категории машины с таким именем — categoryId null', () => {
    const [oil] = buildOnboardingReminders(createTemplateDrafts(), new Map())
    expect(oil.categoryId).toBeNull()
  })

  it('ближайшая смена шин: апрель или ноябрь, текущий месяц смены — сегодня', () => {
    expect(nextTireSwap('2026-10-26')).toEqual({ date: '2026-11-01', monthLabel: 'ноябре' })
    expect(nextTireSwap('2026-11-26')).toEqual({ date: '2026-11-26', monthLabel: 'ноябре' })
    expect(nextTireSwap('2026-12-05')).toEqual({ date: '2027-04-01', monthLabel: 'апреле' })
    expect(nextTireSwap('2026-02-05')).toEqual({ date: '2026-04-01', monthLabel: 'апреле' })
    expect(nextTireSwap('2026-04-30')).toEqual({ date: '2026-04-30', monthLabel: 'апреле' })
  })

  it('шины получают срок — ближайший сезон смены, без «last»', () => {
    const drafts = createTemplateDrafts()
    drafts.tires.enabled = true
    const tires = buildOnboardingReminders(drafts, categories, '2026-10-26').find(
      (item) => item.title === 'Сезонная смена шин',
    )
    expect(tires?.nextDueDate).toBe('2026-11-01')
    expect(tires?.last).toBeUndefined()
  })

  it('подписи шаблонов: «от сегодня», правило без «когда меняли», сезон шин', () => {
    const drafts = createTemplateDrafts()
    const byId = Object.fromEntries(reminderTemplates.map((template) => [template.id, template]))
    const rule = (id: ReminderTemplateId) =>
      describeTemplateRule(byId[id], drafts[id], '2026-10-26').replaceAll(NBSP, ' ')

    expect(rule('oil')).toBe('10 000 км или 12 мес · от сегодня')
    expect(rule('osago')).toBe('Каждые 12 мес')
    expect(rule('timing-belt')).toBe('Каждые 60 000 км или 60 мес')
    expect(rule('tires')).toBe('Весной и осенью · ближайшая в ноябре')

    drafts.oil.lastDate = '2025-03-01'
    expect(rule('oil')).toBe('Каждые 10 000 км или 12 мес')
  })
})
