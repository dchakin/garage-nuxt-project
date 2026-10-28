import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ReminderTemplateChoice } from '@garage/shared/utils/reminderTemplates'
import ReminderPreview from '~/components/reminder/ReminderPreview.vue'
import ReminderTemplates from '~/components/reminder/ReminderTemplates.vue'

describe('ReminderTemplates', () => {
  it('показывает шаблоны и «Своё», созданные помечает галочкой', () => {
    const wrapper = mount(ReminderTemplates, { props: { createdIds: ['oil'] } })
    const chips = wrapper.findAll('button')
    expect(chips).toHaveLength(6)
    expect(chips[0]?.text()).toContain('Масло')
    expect(chips[0]?.attributes('data-created')).toBe('true')
    expect(chips[1]?.attributes('data-created')).toBeUndefined()
    expect(chips.at(-1)?.text()).toBe('Своё')
  })

  it('выбор чипа обновляет v-model', async () => {
    const wrapper = mount(ReminderTemplates, {
      props: {
        createdIds: [],
        modelValue: null,
        'onUpdate:modelValue': (value: ReminderTemplateChoice | null) =>
          wrapper.setProps({ modelValue: value }),
      },
    })
    await wrapper.findAll('button')[1]?.trigger('click')
    expect(wrapper.findAll('button')[1]?.attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('button').at(-1)?.trigger('click')
    expect(wrapper.findAll('button').at(-1)?.attributes('aria-pressed')).toBe('true')
  })
})

describe('ReminderPreview', () => {
  const preview = { nextDueDate: '2027-10-10', nextDueMileage: 97_450, isOverdue: false }

  it('описывает срок по пробегу и дате', () => {
    const wrapper = mount(ReminderPreview, { props: { preview, today: '2026-10-10' } })
    expect(wrapper.text()).toMatch(/на 97\s450\sкм или 10\sокт\s2027/)
    expect(wrapper.text()).not.toContain('Срок уже прошёл')
  })

  it('срок позади — предупреждение', () => {
    const wrapper = mount(ReminderPreview, {
      props: { preview: { ...preview, isOverdue: true }, today: '2026-10-10' },
    })
    expect(wrapper.text()).toContain('Срок уже прошёл')
  })

  it('без интервалов просит их указать', () => {
    const wrapper = mount(ReminderPreview, { props: { preview: null } })
    expect(wrapper.text()).toContain('Укажите интервал')
  })
})
