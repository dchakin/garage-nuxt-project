import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiChip from '~/components/ui/Chip.vue'
import UiSegmented from '~/components/ui/Segmented.vue'
import UiToggle from '~/components/ui/Toggle.vue'
import UiTypeOption from '~/components/ui/TypeOption.vue'

const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
]

describe('UiChip', () => {
  it('выбор эмитит update:modelValue', async () => {
    const wrapper = mount(UiChip, { props: { modelValue: false }, slots: { default: 'Масло' } })
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('без v-model состояние задаёт selected', async () => {
    const wrapper = mount(UiChip, { props: { selected: true }, slots: { default: 'Все' } })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('bg-inverse')
    await wrapper.trigger('click')
    // Родитель не поменял selected — чип остаётся выбранным
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('невыбранный по умолчанию', () => {
    const wrapper = mount(UiChip, { slots: { default: 'Ремонт' } })
    expect(wrapper.attributes('aria-pressed')).toBe('false')
  })
})

describe('UiSegmented', () => {
  it('выбор эмитит update:modelValue', async () => {
    const wrapper = mount(UiSegmented, { props: { options: PERIODS, modelValue: 'month' } })
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ])
    await radios[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['year']])
  })

  it('повторный выбор текущего варианта не эмитит', async () => {
    const wrapper = mount(UiSegmented, { props: { options: PERIODS, modelValue: 'month' } })
    await wrapper.findAll('[role="radio"]')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('стрелки переключают вариант по кругу', async () => {
    const wrapper = mount(UiSegmented, { props: { options: PERIODS, modelValue: 'month' } })
    await wrapper.findAll('[role="radio"]')[0]!.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['all']])
  })
})

describe('UiToggle', () => {
  it('переключается и отдаёт role="switch"', async () => {
    const wrapper = mount(UiToggle, { props: { modelValue: false, label: 'Push' } })
    expect(wrapper.attributes('role')).toBe('switch')
    expect(wrapper.attributes('aria-checked')).toBe('false')
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('disabled не переключается', async () => {
    const wrapper = mount(UiToggle, { props: { modelValue: true, disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('UiTypeOption', () => {
  it('показывает короткую подпись и иконку типа', () => {
    const wrapper = mount(UiTypeOption, { props: { type: 'maintenance', modelValue: null } })
    expect(wrapper.text()).toBe('ТО')
    expect(wrapper.find('svg.lucide-calendar-check').exists()).toBe(true)
    expect(wrapper.attributes('aria-checked')).toBe('false')
  })

  it('выбор эмитит свой тип', async () => {
    const wrapper = mount(UiTypeOption, { props: { type: 'repair', modelValue: 'maintenance' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['repair']])
  })

  it('выбранный подсвечен', () => {
    const wrapper = mount(UiTypeOption, { props: { type: 'repair', modelValue: 'repair' } })
    expect(wrapper.attributes('aria-checked')).toBe('true')
    expect(wrapper.classes()).toContain('bg-accent-soft')
  })
})
