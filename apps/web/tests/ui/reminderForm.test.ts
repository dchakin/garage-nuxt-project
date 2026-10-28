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
  const base = {
    currentMileage: 77_450,
    intervalKm: 10_000,
    intervalMonths: 12,
    last: { date: '2026-02-14', mileage: 77_200 },
    today: '2026-10-10',
  }
  const preview = { nextDueDate: '2027-02-14', nextDueMileage: 87_200, isOverdue: false }

  it('описывает срок по пробегу и дате в info-плашке', () => {
    const wrapper = mount(ReminderPreview, { props: { ...base, preview } })
    expect(wrapper.text()).toContain('Следующее напоминание')
    expect(wrapper.text()).toMatch(/Следующее — 87\s200\sкм или 14\sфев\s2027\./)
    expect(wrapper.find('[data-variant="info"]').exists()).toBe(true)
  })

  it('при одном интервале показывает, откуда срок', () => {
    const wrapper = mount(ReminderPreview, {
      props: {
        ...base,
        intervalKm: null,
        preview: { ...preview, nextDueMileage: null },
        label: 'Если включить',
      },
    })
    expect(wrapper.text()).toContain('Если включить')
    expect(wrapper.text()).toMatch(/14\sфев\s2027: 14\sфев \+ 12\sмес\./)
  })

  it('срок позади — warning с полным объяснением', () => {
    const wrapper = mount(ReminderPreview, {
      props: {
        ...base,
        currentMileage: 87_450,
        last: { date: '2026-02-14', mileage: 77_200 },
        preview: { ...preview, nextDueDate: null, isOverdue: true },
      },
    })
    expect(wrapper.find('[data-variant="warning"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Срок уже прошёл')
    expect(wrapper.text()).toMatch(
      /От 14\sфев · 77\s200\sкм срок был на 87\s200\sкм — просрочено на 250\sкм\./,
    )
    expect(wrapper.text()).toContain('«Требует внимания»')
  })

  it('без интервалов просит заполнить км или месяцы', () => {
    const wrapper = mount(ReminderPreview, {
      props: { ...base, intervalKm: null, intervalMonths: null, preview: null },
    })
    expect(wrapper.text()).toContain('Заполните км или месяцы — покажем, когда сработает.')
  })
})
