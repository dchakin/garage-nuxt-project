import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Plus } from 'lucide-vue-next'
import UiButton from '~/components/ui/Button.vue'
import UiIconButton from '~/components/ui/IconButton.vue'

describe('UiButton', () => {
  it('рендерит подпись и иконку', () => {
    const wrapper = mount(UiButton, {
      props: { icon: Plus },
      slots: { default: 'Добавить запись' },
    })
    expect(wrapper.text()).toBe('Добавить запись')
    expect(wrapper.find('svg.lucide-plus').exists()).toBe(true)
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('кликается и пробрасывает событие', async () => {
    const wrapper = mount(UiButton, { slots: { default: 'Сохранить' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('disabled-кнопка не кликается', async () => {
    const wrapper = mount(UiButton, { props: { disabled: true }, slots: { default: 'Сохранить' } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('loading показывает крутилку вместо иконки и блокирует кнопку', async () => {
    const wrapper = mount(UiButton, {
      props: { loading: true, icon: Plus },
      slots: { default: 'Сохраняем…' },
    })
    expect(wrapper.find('svg.lucide-loader-circle').exists()).toBe(true)
    expect(wrapper.find('svg.lucide-plus').exists()).toBe(false)
    expect(wrapper.attributes('aria-busy')).toBe('true')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('variant задаёт цвет', () => {
    const wrapper = mount(UiButton, { props: { variant: 'danger' } })
    expect(wrapper.classes()).toContain('bg-danger')
  })

  it('с `to` рендерит ссылку', () => {
    const wrapper = mount(UiButton, {
      props: { to: '/cars' },
      slots: { default: 'Машины' },
      global: {
        stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
      },
    })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/cars')
  })
})

describe('UiIconButton', () => {
  it('подпись — в aria-label', () => {
    const wrapper = mount(UiIconButton, { props: { icon: Plus, label: 'Добавить' } })
    expect(wrapper.attributes('aria-label')).toBe('Добавить')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('disabled не кликается', async () => {
    const wrapper = mount(UiIconButton, {
      props: { icon: Plus, label: 'Добавить', disabled: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
