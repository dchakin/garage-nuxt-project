import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NBSP } from '@garage/shared/utils/format'
import type { Entry, Reminder } from '@garage/shared/types'
import { formatMileageAge } from '~/utils/mileageAge'
import MileageCard from '~/components/overview/MileageCard.vue'
import AttentionList from '~/components/overview/AttentionList.vue'
import MonthExpensesCard from '~/components/overview/MonthExpensesCard.vue'
import RecentEntries from '~/components/overview/RecentEntries.vue'

const TODAY = '2026-10-10'
const MILEAGE = 87_450
const global = { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } }

describe('formatMileageAge', () => {
  it('считает календарные дни до сегодня', () => {
    const threeDaysAgo = new Date(2026, 9, 7, 12, 0).toISOString()
    expect(formatMileageAge(threeDaysAgo, TODAY)).toBe(`обновлён 3${NBSP}дня назад`)
    expect(formatMileageAge(new Date(2026, 9, 1, 8, 0).toISOString(), TODAY)).toBe(
      `обновлён 9${NBSP}дней назад`,
    )
  })

  it('сегодня и вчера — словами', () => {
    expect(formatMileageAge(new Date(2026, 9, 10, 1, 0).toISOString(), TODAY)).toBe(
      'обновлён сегодня',
    )
    expect(formatMileageAge(new Date(2026, 9, 9, 23, 0).toISOString(), TODAY)).toBe(
      'обновлён вчера',
    )
  })

  it('пробег не обновлялся — подписи нет', () => {
    expect(formatMileageAge(null, TODAY)).toBeNull()
  })
})

describe('MileageCard', () => {
  it('показывает пробег и давность обновления, без кнопки «Обновить»', () => {
    const updatedAt = new Date(2026, 9, 7, 12, 0).toISOString()
    const wrapper = mount(MileageCard, { props: { mileage: MILEAGE, updatedAt, today: TODAY } })
    expect(wrapper.get('[data-testid="overview-mileage"]').text()).toContain(`87${NBSP}450`)
    expect(wrapper.text()).toContain('обновлён')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('без даты обновления подпись не рендерится', () => {
    const wrapper = mount(MileageCard, { props: { mileage: MILEAGE, updatedAt: null } })
    expect(wrapper.text()).not.toContain('обновлён')
  })
})

const reminder = (id: number, overrides: Partial<Reminder>): Reminder =>
  ({
    id,
    title: `Напоминание ${id}`,
    isActive: true,
    nextDueDate: null,
    nextDueMileage: null,
    intervalKm: null,
    intervalMonths: null,
    ...overrides,
  }) as Reminder

describe('AttentionList', () => {
  const props = { carId: 7, currentMileage: MILEAGE, avgKmPerMonth: null, today: TODAY }

  it('до 3 карточек, просроченные раньше скорых, ссылка «Все сроки»', () => {
    const reminders = [
      reminder(1, { nextDueDate: '2026-10-18' }), // скоро
      reminder(2, { nextDueDate: '2026-09-01' }), // просрочено
      reminder(3, { nextDueDate: '2026-09-02' }), // просрочено
      reminder(4, { nextDueDate: '2026-09-03' }), // просрочено
      reminder(5, { nextDueDate: '2027-01-01' }), // в порядке
    ]
    const wrapper = mount(AttentionList, { props: { ...props, reminders }, global })
    const titles = wrapper.findAll('article h3').map((heading) => heading.text())
    expect(titles).toEqual(['Напоминание 2', 'Напоминание 3', 'Напоминание 4'])
    expect(wrapper.get('a').attributes('href')).toBe('/cars/7/reminders')
    expect(wrapper.get('a').text()).toContain('Все сроки')
  })

  it('нечего показывать — блока нет', () => {
    const reminders = [reminder(1, { nextDueDate: '2027-01-01' })]
    const wrapper = mount(AttentionList, { props: { ...props, reminders }, global })
    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('MonthExpensesCard', () => {
  const byMonth = Array.from({ length: 12 }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, '0')}`,
    total: index === 9 ? 1_200 : 5_000,
  }))

  it('сумма месяца, среднее и 7 столбцов по текущий месяц', () => {
    const wrapper = mount(MonthExpensesCard, {
      props: { analytics: { total: 1_200, avgPerMonth: 9_800, byMonth }, today: TODAY },
    })
    expect(wrapper.text()).toContain('Расходы в октябре')
    expect(wrapper.get('[data-testid="overview-month-total"]').text()).toBe(`1${NBSP}200${NBSP}₽`)
    expect(wrapper.text()).toContain(`в среднем 9${NBSP}800${NBSP}₽ в месяц`)
    expect(wrapper.findAll('[data-testid="mini-bar"]')).toHaveLength(7)
  })

  it('без трат среднее не выводится', () => {
    const wrapper = mount(MonthExpensesCard, {
      props: { analytics: { total: 0, avgPerMonth: 0, byMonth: [] }, today: TODAY },
    })
    expect(wrapper.get('[data-testid="overview-month-total"]').text()).toBe(`0${NBSP}₽`)
    expect(wrapper.text()).not.toContain('в среднем')
    expect(wrapper.find('[data-testid="mini-bar"]').exists()).toBe(false)
  })
})

const entry = (id: number): Entry =>
  ({
    id,
    date: '2026-09-12',
    type: 'maintenance',
    category: null,
    description: `Запись ${id}`,
    mileage: 87_200,
    cost: 6_800,
    place: null,
  }) as Entry

describe('RecentEntries', () => {
  it('три последние записи и ссылка в журнал', () => {
    const entries = [1, 2, 3, 4].map(entry)
    const wrapper = mount(RecentEntries, { props: { carId: 7, entries, today: TODAY }, global })
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('Запись 4')
    expect(wrapper.get('a').attributes('href')).toBe('/cars/7/journal')
  })

  it('нет записей — пустое состояние без ссылки', () => {
    const wrapper = mount(RecentEntries, { props: { carId: 7, entries: [], today: TODAY }, global })
    expect(wrapper.text()).toContain('Записей пока нет')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
