import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NBSP } from '@garage/shared/utils/format'
import UiReminderCard from '~/components/ui/ReminderCard.vue'

// Эталонные напоминания Camry (docs/plans/design-ux-fixes.md): 87 450 км, «сейчас» — 10 окт 2026
const TODAY = '2026-10-10'
const CURRENT_MILEAGE = 87_450
const AVG_KM_PER_MONTH = 1281

const base = {
  isActive: true,
  nextDueDate: null as string | null,
  nextDueMileage: null as number | null,
  intervalKm: null as number | null,
  intervalMonths: null as number | null,
}
const OIL = {
  ...base,
  title: 'Замена масла',
  intervalKm: 10_000,
  intervalMonths: 12,
  nextDueDate: '2027-02-14',
  nextDueMileage: 87_200,
}
const OSAGO = { ...base, title: 'ОСАГО', intervalMonths: 12, nextDueDate: '2026-10-18' }
const TIMING_BELT = { ...base, title: 'Замена ГРМ', intervalKm: 100_000, nextDueMileage: 100_000 }
const TIRES = {
  ...base,
  title: 'Сезонная смена шин',
  intervalMonths: 6,
  nextDueDate: '2026-11-02',
  isActive: false,
}

const nb = (text: string) => text.replace(/(?<=\d|≈) (?=\d|км|дн|мес|окт)/g, NBSP)

function mountCard(reminder: typeof base & { title: string }) {
  return mount(UiReminderCard, {
    props: {
      reminder,
      currentMileage: CURRENT_MILEAGE,
      avgKmPerMonth: AVG_KM_PER_MONTH,
      today: TODAY,
    },
  })
}

describe('UiReminderCard', () => {
  it('Замена масла: «Просрочено на 250 км», срок и кнопка «Сделал»', () => {
    const wrapper = mountCard(OIL)
    expect(wrapper.text()).toContain(nb('Просрочено на 250 км'))
    expect(wrapper.text()).toContain(nb('Каждые 10 000 км или 12 мес'))
    expect(wrapper.text()).toContain(nb('Срок был 87 200 км'))
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.find('.border-l-status-overdue').exists()).toBe(true)
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('Сделал')
  })

  it('ОСАГО: «Через 8 дней», под остатком — дата срока', () => {
    const wrapper = mountCard(OSAGO)
    expect(wrapper.text()).toContain(nb('Через 8 дней'))
    expect(wrapper.text()).toContain(nb('18 окт'))
    expect(wrapper.find('.border-l-status-soon').exists()).toBe(true)
    expect(wrapper.findAll('button').map((button) => button.text())).toContain('Сделал')
  })

  it('ОСАГО: подсказка у «Сделал» — «Продлите полис до …», у остальных — «Срок — …»', () => {
    expect(mountCard(OSAGO).text()).toContain(nb('Продлите полис до 18 окт'))
    expect(mountCard(OSAGO).text()).not.toContain('Срок —')
    const soonOil = { ...OIL, nextDueMileage: 88_000 }
    expect(mountCard(soonOil).text()).toContain(nb('Срок — 88 000 км'))
  })

  it('в порядке — без кнопки «Сделал», с оценкой в месяцах', () => {
    const wrapper = mountCard(TIMING_BELT)
    expect(wrapper.text()).toContain(nb('Через 12 550 км, ≈ 10 мес'))
    expect(wrapper.text()).not.toContain('Сделал')
  })

  it('выключено — бледная, без кнопки', () => {
    const wrapper = mountCard(TIRES)
    expect(wrapper.text()).toContain('Выключено')
    expect(wrapper.classes()).toContain('opacity-60')
    expect(wrapper.text()).not.toContain('Сделал')
  })

  it('тап по карточке — open, «Сделал» — только done', async () => {
    const wrapper = mountCard(OIL)
    await wrapper.get('h3 button').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)

    const doneButton = wrapper.findAll('button').find((button) => button.text() === 'Сделал')!
    await doneButton.trigger('click')
    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('кнопка открытия названа по напоминанию', () => {
    const wrapper = mountCard(OSAGO)
    expect(wrapper.get('h3 button').text()).toBe('ОСАГО')
  })
})
