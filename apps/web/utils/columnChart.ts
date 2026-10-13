import type { ChartData, ChartOptions, Plugin, ScriptableScaleContext } from 'chart.js'
import { formatCompactAmount, formatMoney } from '@garage/shared/utils/format'

/** Токены, которые canvas-график берёт из tokens.css (useCssColors) */
export const COLUMN_CHART_COLOR_TOKENS = [
  'chart-bar',
  'chart-bar-muted',
  'text',
  'text-2',
  'inverse',
  'on-inverse',
] as const

export type ColumnChartColors = Record<(typeof COLUMN_CHART_COLOR_TOKENS)[number], string>

export interface ColumnChartBar {
  /** Подпись оси: `сен`, `2026` */
  label: string
  /** Сумма, ₽ */
  value: number
}

export interface ColumnChartStyle {
  /** Текущий период — акцентный столбец и жирная подпись; null — без акцента */
  currentIndex: number | null
  colors: ColumnChartColors
  fontFamily: string
  reduceMotion: boolean
}

/** Значения из макета («06 · Компоненты: данные», «Anim · Графики расходов») */
const AXIS_FONT_SIZE = 12
const BAR_MAX_THICKNESS = 28
const BAR_MIN_LENGTH = 2
const BAR_RADIUS = { topLeft: 6, topRight: 6, bottomLeft: 2, bottomRight: 2 }
const VALUE_LABEL_SPACE = 20
const VALUE_LABEL_GAP = 4
const ANIMATION_MS = 320
const ANIMATION_STEP_MS = 30

export function buildColumnChartData(
  bars: readonly ColumnChartBar[],
  { currentIndex, colors }: Pick<ColumnChartStyle, 'currentIndex' | 'colors'>,
): ChartData<'bar'> {
  const barColors = bars.map((_, index) =>
    index === currentIndex ? colors['chart-bar'] : colors['chart-bar-muted'],
  )
  return {
    labels: bars.map((bar) => bar.label),
    datasets: [
      {
        data: bars.map((bar) => bar.value),
        backgroundColor: barColors,
        hoverBackgroundColor: barColors,
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: BAR_MAX_THICKNESS,
        minBarLength: BAR_MIN_LENGTH,
      },
    ],
  }
}

function buildScales({
  currentIndex,
  colors,
  fontFamily,
}: ColumnChartStyle): ChartOptions<'bar'>['scales'] {
  const isCurrent = (context: ScriptableScaleContext) => context.index === currentIndex
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: (context) => (isCurrent(context) ? colors.text : colors['text-2']),
        font: (context) => ({
          family: fontFamily,
          size: AXIS_FONT_SIZE,
          weight: isCurrent(context) ? 600 : 400,
        }),
      },
    },
    y: { display: false, beginAtZero: true },
  }
}

/** Тултип по тапу — инверсный, полная сумма */
function buildTooltip({ colors, fontFamily }: ColumnChartStyle) {
  const font = { family: fontFamily, size: AXIS_FONT_SIZE }
  return {
    backgroundColor: colors.inverse,
    titleColor: colors['on-inverse'],
    bodyColor: colors['on-inverse'],
    titleFont: { ...font, weight: 400 },
    bodyFont: { ...font, weight: 600 },
    displayColors: false,
    cornerRadius: 8,
    callbacks: {
      label: (item: { parsed: { y: number | null } }) => formatMoney(item.parsed.y ?? 0),
    },
  }
}

/** Первый показ — столбцы растут по очереди (шаг 30 мс), смена данных — перетекают к новой высоте */
function buildAnimation(reduceMotion: boolean): ChartOptions<'bar'>['animation'] {
  if (reduceMotion) return false
  return {
    duration: ANIMATION_MS,
    easing: 'easeOutQuart',
    delay: (context) =>
      context.type === 'data' && context.mode === 'default'
        ? context.dataIndex * ANIMATION_STEP_MS
        : 0,
  }
}

export function buildColumnChartOptions(style: ColumnChartStyle): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: VALUE_LABEL_SPACE } },
    // Тап по любой точке колонки, а не только по самому столбцу: низкие столбцы не попасть пальцем
    interaction: { mode: 'index', intersect: false },
    datasets: { bar: { barPercentage: 0.9, categoryPercentage: 0.85 } },
    scales: buildScales(style),
    plugins: { legend: { display: false }, tooltip: buildTooltip(style) },
    animation: buildAnimation(style.reduceMotion),
  }
}

/**
 * Сумма над одним столбцом (`48,6 т`). Индекс и цвета читаются при каждой отрисовке —
 * плагин передаётся в chart.js один раз, а значения меняются вместе с props и темой.
 */
export function createValueLabelPlugin(
  read: () => { index: number | null; color: string; fontFamily: string },
): Plugin<'bar'> {
  return {
    id: 'garageValueLabel',
    afterDatasetsDraw(chart) {
      const { index, color, fontFamily } = read()
      if (index === null) return
      const bar = chart.getDatasetMeta(0).data[index]
      const value = chart.data.datasets[0]?.data[index]
      if (!bar || typeof value !== 'number') return
      const { ctx } = chart
      ctx.save()
      ctx.fillStyle = color
      ctx.font = `600 ${AXIS_FONT_SIZE}px ${fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(formatCompactAmount(value), bar.x, bar.y - VALUE_LABEL_GAP)
      ctx.restore()
    },
  }
}
