import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Bell } from 'lucide-vue-next'
import { NBSP } from '@garage/shared/utils/format'
import UiCard from '~/components/ui/Card.vue'
import UiRowEntry from '~/components/ui/RowEntry.vue'
import UiRowSetting from '~/components/ui/RowSetting.vue'
import UiRowKeyValue from '~/components/ui/RowKeyValue.vue'
import UiRowCar from '~/components/ui/RowCar.vue'
import UiRowToggle from '~/components/ui/RowToggle.vue'
import UiMonthHeader from '~/components/ui/MonthHeader.vue'
import UiSectionHeader from '~/components/ui/SectionHeader.vue'

const TODAY = '2026-10-10'
const OIL_CHANGE = {
  date: '2026-09-12',
  type: 'maintenance' as const,
  category: null,
  description: 'Замена масла и фильтра',
  mileage: 87200,
  cost: 6800,
  place: 'Сервис на Ленина',
}
const CAMRY = {
  brand: 'Toyota',
  model: 'Camry',
  year: 2018,
  plateNumber: 'А123ВС77',
  currentMileage: 87450,
}
const NuxtLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('UiCard', () => {
  it('разделитель сверху у всех строк, кроме первой', () => {
    const wrapper = mount(UiCard, { props: { tag: 'ul' }, slots: { default: '<li>1</li>' } })
    expect(wrapper.element.tagName).toBe('UL')
    expect(wrapper.classes()).toContain('[&>*:not(:first-child)]:border-t')
  })
})

describe('UiRowEntry', () => {
  it('заголовок, сумма и мета через точку', () => {
    const wrapper = mount(UiRowEntry, { props: { entry: OIL_CHANGE, today: TODAY } })
    expect(wrapper.text()).toContain('Замена масла и фильтра')
    expect(wrapper.text()).toContain(`6${NBSP}800${NBSP}₽`)
    expect(wrapper.text()).toContain(`12${NBSP}сент · 87${NBSP}200${NBSP}км · Сервис на Ленина`)
  })

  it('без описания — категория, без категории — тип; пустые части меты и суммы пропускаются', () => {
    const bare = { ...OIL_CHANGE, type: 'other' as const, description: ' ', mileage: null }
    const byType = mount(UiRowEntry, {
      props: { entry: { ...bare, cost: null, place: null }, today: TODAY },
    })
    expect(byType.text()).toBe(`Прочее—12${NBSP}сент`)

    const byCategory = mount(UiRowEntry, {
      props: {
        entry: { ...bare, category: { id: 1, carId: null, name: 'Шины', isDefault: true } },
      },
    })
    expect(byCategory.text()).toContain('Шины')
  })

  it('вся строка — кнопка, клик → open', async () => {
    const wrapper = mount(UiRowEntry, { props: { entry: OIL_CHANGE } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    await wrapper.trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})

describe('UiRowSetting', () => {
  it('подпись, значение, иконка и шеврон; без to — кнопка', () => {
    const wrapper = mount(UiRowSetting, {
      props: { label: 'Push-уведомления', value: 'Включены', icon: Bell },
    })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.text()).toBe('Push-уведомленияВключены')
    expect(wrapper.find('svg.lucide-bell').exists()).toBe(true)
    expect(wrapper.find('svg.lucide-chevron-right').exists()).toBe(true)
  })

  it('с to — ссылка', () => {
    const wrapper = mount(UiRowSetting, {
      props: { label: 'Тема', to: '/settings/theme' },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find('a').attributes('href')).toBe('/settings/theme')
  })
})

describe('UiRowKeyValue', () => {
  it('значение из props или слота', () => {
    const props = { label: 'Стоимость километра', value: `4,8${NBSP}₽` }
    expect(mount(UiRowKeyValue, { props }).text()).toBe(`Стоимость километра4,8${NBSP}₽`)
    expect(mount(UiRowKeyValue, { props, slots: { default: 'нет данных' } }).text()).toBe(
      'Стоимость километранет данных',
    )
  })
})

describe('UiRowCar', () => {
  it('название, номер, пробег и бейдж просроченных', () => {
    const wrapper = mount(UiRowCar, { props: { car: CAMRY, overdueCount: 2, soonCount: 1 } })
    expect(wrapper.text()).toContain('Toyota Camry · 2018')
    expect(wrapper.find('[aria-label="Госномер А123ВС 77"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(`87${NBSP}450${NBSP}км`)
    expect(wrapper.text()).toContain('2 просрочено')
    expect(wrapper.text()).not.toContain('скоро')
  })

  it('без просроченных — «скоро», без напоминаний — без бейджа', () => {
    expect(mount(UiRowCar, { props: { car: CAMRY, soonCount: 1 } }).text()).toContain('1 скоро')
    const quiet = mount(UiRowCar, { props: { car: { ...CAMRY, year: null, plateNumber: null } } })
    expect(quiet.text()).toBe(`Toyota Camry87${NBSP}450${NBSP}км`)
  })

  it('выбранная — галочка и aria-current; клик → select', async () => {
    const wrapper = mount(UiRowCar, { props: { car: CAMRY, selected: true } })
    expect(wrapper.attributes('aria-current')).toBe('true')
    expect(wrapper.find('svg.lucide-check').exists()).toBe(true)
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})

describe('UiRowToggle', () => {
  it('заголовок подписывает переключатель, клик эмитит update:modelValue', async () => {
    const wrapper = mount(UiRowToggle, {
      props: { title: 'Замена масла', subtitle: 'Каждые 10 000 км', modelValue: false },
    })
    const toggle = wrapper.get('[role="switch"]')
    const titleId = toggle.attributes('aria-labelledby')
    expect(wrapper.get(`#${titleId}`).text()).toBe('Замена масла')
    expect(wrapper.text()).toContain('Каждые 10 000 км')
    await toggle.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('disabled — не переключается', async () => {
    const wrapper = mount(UiRowToggle, { props: { title: 'ОСАГО', disabled: true } })
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('UiMonthHeader', () => {
  it('месяц и сумма', () => {
    const wrapper = mount(UiMonthHeader, { props: { title: 'Сентябрь 2026', total: 12200 } })
    expect(wrapper.get('h3').text()).toBe('Сентябрь 2026')
    expect(wrapper.text()).toContain(`12${NBSP}200${NBSP}₽`)
  })

  it('без суммы — только месяц', () => {
    expect(mount(UiMonthHeader, { props: { title: 'Май 2026' } }).text()).toBe('Май 2026')
  })
})

describe('UiSectionHeader', () => {
  it('заголовок h2 и ссылка «Все»', () => {
    const wrapper = mount(UiSectionHeader, {
      props: { title: 'Требует внимания', to: '/reminders' },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.get('h2').text()).toBe('Требует внимания')
    expect(wrapper.get('a').attributes('href')).toBe('/reminders')
    expect(wrapper.get('a').text()).toBe('Все')
  })

  it('без to — без ссылки', () => {
    expect(
      mount(UiSectionHeader, { props: { title: 'Записи' } })
        .find('a')
        .exists(),
    ).toBe(false)
  })
})
