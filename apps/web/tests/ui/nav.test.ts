import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount, RouterLinkStub } from '@vue/test-utils'
import UiAppBar from '~/components/ui/AppBar.vue'
import UiTabBar from '~/components/ui/TabBar.vue'
import { carTabPath } from '~/utils/carTabs'

const global = { stubs: { NuxtLink: RouterLinkStub } }

describe('UiTabBar', () => {
  const mountTabBar = (props: { active?: 'overview' | 'reminders' | null; badge?: number }) =>
    mount(UiTabBar, { props: { carId: 7, ...props }, global })

  it('ведёт вкладки на маршруты машины, «＋» — кнопка, а не ссылка', () => {
    const wrapper = mountTabBar({})
    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(targets).toEqual(['/cars/7', '/cars/7/journal', '/cars/7/reminders', '/cars/7/expenses'])
    expect(wrapper.get('button').attributes('aria-label')).toBe('Добавить запись')
  })

  it('«＋» эмитит add', async () => {
    const wrapper = mountTabBar({})
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('активная вкладка помечена aria-current и акцентом', () => {
    const wrapper = mountTabBar({ active: 'reminders' })
    const current = wrapper.findAll('[aria-current="page"]')

    expect(current).toHaveLength(1)
    expect(current[0]!.text()).toContain('Напоминания')
    expect(current[0]!.classes()).toContain('text-accent-text')
  })

  it('показывает счётчик на «Напоминаниях» и озвучивает его', () => {
    const wrapper = mountTabBar({ badge: 3 })
    const reminders = wrapper.findAllComponents(RouterLinkStub)[2]!

    expect(reminders.text()).toContain('3')
    expect(reminders.get('.sr-only').text()).toContain('требуют внимания: 3')
  })

  it('при badge = 0 счётчик не рендерит', () => {
    const wrapper = mountTabBar({ badge: 0 })
    const reminders = wrapper.findAllComponents(RouterLinkStub)[2]!

    expect(reminders.text()).toBe('Напоминания')
    expect(reminders.find('.sr-only').exists()).toBe(false)
  })
})

describe('carTabPath', () => {
  it('«Обзор» — корень машины, остальные — подпуть', () => {
    expect(carTabPath(3, 'overview')).toBe('/cars/3')
    expect(carTabPath(3, 'expenses')).toBe('/cars/3/expenses')
  })
})

describe('UiAppBar', () => {
  it('car: название и госномер — кнопка переключателя, аватар ведёт в профиль', async () => {
    const wrapper = mount(UiAppBar, {
      props: {
        variant: 'car',
        carName: 'Toyota Camry',
        plateNumber: 'А123ВС77',
        userName: 'Дмитрий',
      },
      global,
    })
    const switcher = wrapper.get('button')

    expect(switcher.attributes('aria-label')).toBe('Сменить машину: Toyota Camry')
    expect(switcher.attributes('aria-haspopup')).toBe('dialog')
    expect(switcher.text()).toContain('А123ВС')
    await switcher.trigger('click')
    expect(wrapper.emitted('switch')).toHaveLength(1)

    const profile = wrapper.getComponent(RouterLinkStub)
    expect(profile.props('to')).toBe('/profile')
    expect(profile.attributes('aria-label')).toBe('Профиль')
    expect(profile.text()).toBe('Д')
  })

  it('car: без госномера плашки нет', () => {
    const wrapper = mount(UiAppBar, {
      props: { variant: 'car', carName: 'Kia Rio', userName: 'Дмитрий' },
      global,
    })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
  })

  it('back: заголовок h1, «Назад» без ссылки эмитит back, слот action справа', async () => {
    const wrapper = mount(UiAppBar, {
      props: { variant: 'back', title: 'Изменить автомобиль' },
      slots: { action: () => h('button', { type: 'button' }, 'Готово') },
      global,
    })

    expect(wrapper.get('h1').text()).toBe('Изменить автомобиль')
    await wrapper.get('[aria-label="Назад"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.text()).toContain('Готово')
  })

  it('back: с backTo «Назад» — ссылка и back не эмитит', async () => {
    const wrapper = mount(UiAppBar, {
      props: { variant: 'back', title: 'Профиль', backTo: '/cars' },
      global,
    })
    const back = wrapper.getComponent(RouterLinkStub)

    expect(back.props('to')).toBe('/cars')
    await back.trigger('click')
    expect(wrapper.emitted('back')).toBeUndefined()
  })
})
