import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { NBSP, formatMoney } from '@garage/shared/utils/format'
import ExpensesSummary from '~/components/expenses/ExpensesSummary.vue'
import ExpensesCharts from '~/components/expenses/ExpensesCharts.vue'

// В happy-dom нет canvas: график подменяется заглушкой
vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'Bar',
    props: ['data', 'options', 'plugins', 'ariaLabel'],
    setup: () => () => h('canvas'),
  }),
}))

const TODAY = '2026-10-10'

const YEAR = {
  total: 88500,
  costPerKm: 8.6,
  avgEntry: 11060,
  topMonth: { month: '2026-05', total: 48600 },
}

describe('ExpensesSummary', () => {
  it('год: сумма без подписи и метрики как в макете (без «в среднем в месяц»)', () => {
    const wrapper = mount(ExpensesSummary, {
      props: { analytics: YEAR, period: 'year', today: TODAY },
    })
    expect(wrapper.get('[data-testid="expenses-total"]').text()).toBe(formatMoney(88500))
    expect(wrapper.text()).not.toContain('Потрачено')
    const metrics = wrapper.get('[data-testid="expenses-metrics"]').text()
    expect(metrics).toContain(`Стоимость километра8,6${NBSP}₽`)
    expect(metrics).not.toContain('/км')
    expect(metrics).toContain(`Средняя запись${formatMoney(11060)}`)
    expect(metrics).toContain(`Больше всего в мае${formatMoney(48600)}`)
    expect(metrics).not.toContain('В среднем')
  })

  it('знак рубля в сумме — отдельный мелкий элемент', () => {
    const wrapper = mount(ExpensesSummary, {
      props: { analytics: YEAR, period: 'year', today: TODAY },
    })
    expect(wrapper.get('[data-testid="expenses-total"] span').text()).toBe('₽')
  })

  it('месяц: без «Больше всего»', () => {
    const wrapper = mount(ExpensesSummary, {
      props: { analytics: { ...YEAR, total: 10300 }, period: 'month', today: TODAY },
    })
    const metrics = wrapper.get('[data-testid="expenses-metrics"]').text()
    expect(metrics).not.toContain('Больше всего')
    expect(metrics).toContain('Стоимость километра')
  })

  it('нулевые метрики не выводятся, период без трат — «0 ₽» (Ж3)', () => {
    const wrapper = mount(ExpensesSummary, {
      props: {
        analytics: { total: 0, costPerKm: 0, avgEntry: 0, topMonth: null },
        period: 'month',
        today: TODAY,
      },
    })
    expect(wrapper.find('[data-testid="expenses-metrics"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="expenses-total"]').text()).toBe(formatMoney(0))
  })
})

describe('ExpensesCharts', () => {
  const byMonth = Array.from({ length: 12 }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, '0')}`,
    total: index === 4 ? 48600 : 0,
  }))
  const byCategory = [
    { categoryId: 1, name: 'Шины', total: 48600, share: 85 },
    { categoryId: null, name: 'Без категории', total: 8500, share: 15 },
  ]

  it('рисует столбцы по месяцам и категории по убыванию', () => {
    const wrapper = mount(ExpensesCharts, {
      props: {
        analytics: { byMonth, byCategory },
        query: { period: 'year', date: '2026' },
        today: TODAY,
      },
    })
    expect(wrapper.text()).toContain('По месяцам')
    // От мая (первая трата) до октября — будущих месяцев нет
    expect(wrapper.findComponent({ name: 'Bar' }).props('data').labels).toHaveLength(6)
    const rows = wrapper.get('[data-testid="expenses-categories"]').findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Шины')
  })

  it('«Всё время» — подпись «по годам», без категорий блока нет', () => {
    const wrapper = mount(ExpensesCharts, {
      props: {
        analytics: { byMonth, byCategory: [] },
        query: { period: 'all', date: null },
        today: TODAY,
      },
    })
    expect(wrapper.text()).toContain('По годам')
    expect(wrapper.find('[data-testid="expenses-categories"]').exists()).toBe(false)
  })
})
