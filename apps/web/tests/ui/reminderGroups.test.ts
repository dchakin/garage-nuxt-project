import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Reminder } from '@garage/shared/types'
import ReminderGroups from '~/components/reminder/ReminderGroups.vue'

// Как в эталонных данных Camry: 87 450 км, «сейчас» — 10 окт 2026
const TODAY = '2026-10-10'
const CURRENT_MILEAGE = 87_450

const reminder = (overrides: Partial<Reminder>): Reminder =>
  ({
    id: 1,
    title: 'Напоминание',
    isActive: true,
    nextDueDate: null,
    nextDueMileage: null,
    intervalKm: null,
    intervalMonths: null,
    ...overrides,
  }) as Reminder

const OIL = reminder({ id: 1, title: 'Замена масла', intervalKm: 10_000, nextDueMileage: 87_200 })
const INSPECTION = reminder({ id: 2, title: 'Техосмотр', nextDueDate: '2026-09-01' })
const OSAGO = reminder({ id: 3, title: 'ОСАГО', nextDueDate: '2026-10-18' })
const BELT = reminder({ id: 4, title: 'Замена ГРМ', intervalKm: 100_000, nextDueMileage: 100_000 })
const TIRES = reminder({ id: 5, title: 'Шины', isActive: false, nextDueDate: '2026-11-02' })

function mountGroups(reminders: Reminder[]) {
  return mount(ReminderGroups, {
    props: { reminders, currentMileage: CURRENT_MILEAGE, avgKmPerMonth: null, today: TODAY },
  })
}

describe('ReminderGroups', () => {
  it('группы идут по статусам, выключенные — последней, с числом в заголовке', () => {
    const wrapper = mountGroups([TIRES, BELT, OSAGO, INSPECTION, OIL])

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      'Просрочено · 2',
      'Скоро · 1',
      'В порядке · 1',
      'Выключено · 1',
    ])
    const overdue = wrapper.get('[data-testid="reminder-group-overdue"]')
    expect(overdue.findAll('article')).toHaveLength(2)
  })

  it('пустые группы не выводятся', () => {
    const wrapper = mountGroups([BELT])

    expect(wrapper.findAll('section')).toHaveLength(1)
    expect(wrapper.find('[data-testid="reminder-group-ok"]').exists()).toBe(true)
  })

  it('открытие и «Сделал» поднимают само напоминание', async () => {
    const wrapper = mountGroups([OIL])

    await wrapper.get('h3 button').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Сделал')!
      .trigger('click')

    expect(wrapper.emitted('open')?.[0]).toEqual([OIL])
    expect(wrapper.emitted('done')?.[0]).toEqual([OIL])
  })
})
