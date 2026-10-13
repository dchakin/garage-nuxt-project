import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { ChartData, ChartOptions } from 'chart.js'
import UiCategoryBar from '~/components/ui/CategoryBar.vue'
import UiMiniBars from '~/components/ui/MiniBars.vue'
import UiColumnChart from '~/components/ui/ColumnChart.vue'
import { NBSP } from '@garage/shared/utils/format'
import { buildColumnChartOptions, createValueLabelPlugin } from '~/utils/columnChart'

// В happy-dom нет canvas: график подменяется заглушкой, проверяем, что уходит в chart.js
vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'Bar',
    props: ['data', 'options', 'plugins', 'ariaLabel'],
    setup: () => () => h('canvas'),
  }),
}))

const LIGHT = { 'chart-bar': '#2e4fe0', 'chart-bar-muted': '#d6dbf6', text: '#1c1b19' }
const DARK = { 'chart-bar': '#7b8cff', 'chart-bar-muted': '#2e3456', text: '#f3f2ee' }

function setTokens(tokens: Record<string, string>) {
  for (const [name, value] of Object.entries(tokens))
    document.documentElement.style.setProperty(`--${name}`, value)
}

const BARS = [
  { label: 'авг', value: 9000 },
  { label: 'сен', value: 12200 },
]

function chartProps(wrapper: ReturnType<typeof mount>) {
  const bar = wrapper.findComponent({ name: 'Bar' })
  return {
    data: bar.props('data') as ChartData<'bar'>,
    options: bar.props('options') as ChartOptions<'bar'>,
  }
}

describe('UiColumnChart', () => {
  beforeEach(() => setTokens(LIGHT))
  afterEach(() => {
    document.documentElement.removeAttribute('style')
    document.documentElement.classList.remove('dark')
  })

  it('цвета столбцов — из CSS-переменных, текущий — акцентный', () => {
    const wrapper = mount(UiColumnChart, {
      props: { bars: BARS, currentIndex: 1, label: 'Расходы' },
    })
    const { data } = chartProps(wrapper)
    expect(data.labels).toEqual(['авг', 'сен'])
    expect(data.datasets[0].data).toEqual([9000, 12200])
    expect(data.datasets[0].backgroundColor).toEqual(['#d6dbf6', '#2e4fe0'])
  })

  it('при смене темы цвета перечитываются', async () => {
    const wrapper = mount(UiColumnChart, {
      props: { bars: BARS, currentIndex: 1, label: 'Расходы' },
    })
    setTokens(DARK)
    document.documentElement.classList.add('dark')
    await new Promise((resolve) => setTimeout(resolve))
    await nextTick()
    expect(chartProps(wrapper).data.datasets[0].backgroundColor).toEqual(['#2e3456', '#7b8cff'])
  })

  it('для скринридера — подпись и суммы текстом', () => {
    const wrapper = mount(UiColumnChart, {
      props: { bars: BARS, currentIndex: 1, label: 'Расходы по месяцам' },
    })
    expect(wrapper.find('figcaption').text()).toContain('Расходы по месяцам')
    expect(wrapper.find('figcaption').text()).toContain(`сен: 12${NBSP}200${NBSP}₽`)
  })
})

describe('columnChart options', () => {
  const style = {
    currentIndex: 1,
    colors: { ...LIGHT, 'text-2': '#5e5b54', inverse: '#1c1b19', 'on-inverse': '#f5f4f0' },
    fontFamily: 'Onest',
    reduceMotion: false,
  }

  it('подпись текущего периода — цвет text и 600, остальные — text-2', () => {
    const ticks = buildColumnChartOptions(style).scales!.x!.ticks!
    const color = ticks.color as (context: { index: number }) => string
    const font = ticks.font as (context: { index: number }) => { weight: number }
    expect(color({ index: 1 })).toBe('#1c1b19')
    expect(color({ index: 0 })).toBe('#5e5b54')
    expect(font({ index: 1 }).weight).toBe(600)
    expect(font({ index: 0 }).weight).toBe(400)
  })

  it('тултип — по тапу в любую точку колонки, инверсный', () => {
    const options = buildColumnChartOptions(style)
    expect(options.interaction).toEqual({ mode: 'index', intersect: false })
    expect(options.plugins!.tooltip).toMatchObject({ backgroundColor: '#1c1b19' })
  })

  it('reduced motion — без анимации', () => {
    expect(buildColumnChartOptions({ ...style, reduceMotion: true }).animation).toBe(false)
    expect(buildColumnChartOptions(style).animation).toMatchObject({ duration: 320 })
  })

  it('сумма над столбцом — сокращённо, цветом из темы', () => {
    const fillText = vi.fn()
    const ctx = { save() {}, restore() {}, fillText, fillStyle: '', font: '' }
    const chart = {
      ctx,
      data: { datasets: [{ data: [9000, 48600] }] },
      getDatasetMeta: () => ({
        data: [
          { x: 10, y: 50 },
          { x: 40, y: 20 },
        ],
      }),
    }
    const plugin = createValueLabelPlugin(() => ({ index: 1, color: '#123', fontFamily: 'Onest' }))
    // @ts-expect-error — в тесте нужен только кусок Chart, который читает плагин
    plugin.afterDatasetsDraw!(chart, {}, {})
    expect(fillText).toHaveBeenCalledWith(`48,6${NBSP}т`, 40, 16)
    expect(ctx.fillStyle).toBe('#123')
  })
})

describe('UiCategoryBar', () => {
  it('рисует долю из props', () => {
    const wrapper = mount(UiCategoryBar, { props: { name: 'Шины', amount: 48600, share: 55 } })
    expect(wrapper.text()).toContain('Шины')
    expect(wrapper.text()).toContain(`55${NBSP}%`)
    expect(wrapper.text()).toContain(`48${NBSP}600${NBSP}₽`)
    expect(wrapper.get('[data-testid="category-bar-fill"]').attributes('style')).toContain(
      'width: 55%',
    )
  })

  it('доля вне 0…100 обрезается', () => {
    const wrapper = mount(UiCategoryBar, { props: { name: 'Прочее', amount: 1, share: 140 } })
    expect(wrapper.get('[data-testid="category-bar-fill"]').attributes('style')).toContain(
      'width: 100%',
    )
  })
})

describe('UiMiniBars', () => {
  it('высоты пропорциональны максимуму, акцент — последний столбец', () => {
    const wrapper = mount(UiMiniBars, { props: { values: [0, 22000, 44000] } })
    const bars = wrapper.findAll('[data-testid="mini-bar"]')
    expect(bars.map((bar) => bar.attributes('style'))).toEqual([
      'height: 2px;',
      'height: 22px;',
      'height: 44px;',
    ])
    expect(bars[2].classes()).toContain('bg-chart-bar')
    expect(bars[1].classes()).toContain('bg-chart-bar-muted')
  })

  it('currentIndex переносит акцент', () => {
    const wrapper = mount(UiMiniBars, { props: { values: [1, 2, 3], currentIndex: 0 } })
    expect(wrapper.findAll('[data-testid="mini-bar"]')[0].classes()).toContain('bg-chart-bar')
  })
})
