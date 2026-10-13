import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { entryTypeLabels, entryTypes } from '@garage/shared/schemas/entry'
import type { ReminderStatus } from '@garage/shared/types'
import UiTypeBadge from '~/components/ui/TypeBadge.vue'
import UiStatusBadge from '~/components/ui/StatusBadge.vue'
import UiCounter from '~/components/ui/Counter.vue'
import UiAvatar from '~/components/ui/Avatar.vue'
import UiPlate from '~/components/ui/Plate.vue'
import UiProgress from '~/components/ui/Progress.vue'
import { splitPlate } from '~/utils/plate'

const STATUS_CASES: { status: ReminderStatus; text: string; colorClass: string }[] = [
  { status: 'overdue', text: 'Просрочено', colorClass: 'text-status-overdue-text' },
  { status: 'soon', text: 'Скоро', colorClass: 'text-status-soon-text' },
  { status: 'ok', text: 'В порядке', colorClass: 'text-status-ok-text' },
  { status: 'inactive', text: 'Выключено', colorClass: 'text-status-inactive-text' },
]

const TYPE_COLOR_CLASSES = {
  maintenance: 'text-type-service',
  repair: 'text-type-repair',
  replacement: 'text-type-replace',
  purchase: 'text-type-purchase',
  other: 'text-type-other',
} as const

describe('UiStatusBadge', () => {
  it.each(STATUS_CASES)(
    '$status: иконка + «$text» цвета статуса',
    ({ status, text, colorClass }) => {
      const wrapper = mount(UiStatusBadge, { props: { status } })
      expect(wrapper.text()).toBe(text)
      expect(wrapper.classes()).toContain(colorClass)
      expect(wrapper.find('svg[aria-hidden="true"]').exists()).toBe(true)
    },
  )

  it('слот заменяет слово', () => {
    const wrapper = mount(UiStatusBadge, {
      props: { status: 'overdue' },
      slots: { default: '2 просрочено' },
    })
    expect(wrapper.text()).toBe('2 просрочено')
  })
})

describe('UiTypeBadge', () => {
  it.each(entryTypes)('%s: иконка цвета типа и название для скринридера', (type) => {
    const wrapper = mount(UiTypeBadge, { props: { type } })
    expect(wrapper.attributes('aria-label')).toBe(entryTypeLabels[type])
    expect(wrapper.find('svg').classes()).toContain(TYPE_COLOR_CLASSES[type])
  })
})

describe('UiCounter', () => {
  it('показывает число', () => {
    expect(mount(UiCounter, { props: { count: 3 } }).text()).toBe('3')
  })

  it('при 0 не рендерится', () => {
    expect(
      mount(UiCounter, { props: { count: 0 } })
        .find('span')
        .exists(),
    ).toBe(false)
  })

  it('больше 99 — «99+»', () => {
    expect(mount(UiCounter, { props: { count: 120 } }).text()).toBe('99+')
  })
})

describe('UiAvatar', () => {
  it('первая буква имени заглавной', () => {
    expect(mount(UiAvatar, { props: { name: ' дмитрий' } }).text()).toBe('Д')
  })
})

describe('UiPlate', () => {
  it('номер и регион через разделитель', () => {
    const wrapper = mount(UiPlate, { props: { plateNumber: 'а123вс77' } })
    expect(wrapper.text()).toBe('А123ВС77')
    expect(wrapper.attributes('aria-label')).toBe('Госномер А123ВС 77')
  })
})

describe('splitPlate', () => {
  it.each([
    ['А123ВС77', 'А123ВС', '77'],
    ['а123вс 777', 'А123ВС', '777'],
    ['А123ВС | 77', 'А123ВС', '77'],
  ])('%s → %s / %s', (input, plateNumber, region) => {
    expect(splitPlate(input)).toEqual({ number: plateNumber, region })
  })

  it('нестандартный номер — целиком', () => {
    expect(splitPlate('CD 1234')).toEqual({ number: 'CD 1234', region: null })
  })
})

describe('UiProgress', () => {
  it('доля → проценты, цвет по статусу', () => {
    const wrapper = mount(UiProgress, { props: { value: 0.734, tone: 'soon' } })
    expect(wrapper.attributes('aria-valuenow')).toBe('73')
    expect(wrapper.find('[role="progressbar"] > div').classes()).toContain('bg-status-soon')
  })

  it('вне 0…1 обрезается', () => {
    expect(mount(UiProgress, { props: { value: 1.4 } }).attributes('aria-valuenow')).toBe('100')
    expect(mount(UiProgress, { props: { value: -2 } }).attributes('aria-valuenow')).toBe('0')
  })
})
