import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiPeriodSwitcher from '~/components/ui/PeriodSwitcher.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

describe('UiPeriodSwitcher', () => {
  const mountSwitcher = (canPrev: boolean, canNext: boolean) =>
    mount(UiPeriodSwitcher, { props: { label: '2026 год', canPrev, canNext } })

  it('активные стрелки эмитят prev/next', async () => {
    const wrapper = mountSwitcher(true, true)
    expect(wrapper.text()).toContain('2026 год')
    await wrapper.get('[aria-label="Предыдущий период"]').trigger('click')
    await wrapper.get('[aria-label="Следующий период"]').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('неактивная стрелка выключена и не эмитит событие', async () => {
    const wrapper = mountSwitcher(true, false)
    const next = wrapper.get('[aria-label="Следующий период"]')
    expect(next.attributes('disabled')).toBeDefined()
    await next.trigger('click')
    // Даже если клик дошёл (disabled сняли снаружи) — событие не уходит
    next.element.removeAttribute('disabled')
    await next.trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })
})

describe('UiSkeleton', () => {
  it.each(['line', 'card', 'row'] as const)('%s скрыт от скринридера', (variant) => {
    const wrapper = mount(UiSkeleton, { props: { variant } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('data-skeleton')).toBe(variant)
  })

  it('row повторяет строку: плитка, две строки, сумма', () => {
    const wrapper = mount(UiSkeleton, { props: { variant: 'row' } })
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(4)
  })

  it('размер line/card задаётся классом снаружи', () => {
    const wrapper = mount(UiSkeleton, { props: { variant: 'line' }, attrs: { class: 'w-[180px]' } })
    expect(wrapper.classes()).toContain('w-[180px]')
  })
})
