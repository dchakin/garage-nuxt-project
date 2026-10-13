<script setup lang="ts">
import { computed } from 'vue'
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatMoney } from '@garage/shared/utils/format'
import { useCssColors } from '~/composables/useCssColors'
import {
  COLUMN_CHART_COLOR_TOKENS,
  buildColumnChartData,
  buildColumnChartOptions,
  createValueLabelPlugin,
  type ColumnChartBar,
} from '~/utils/columnChart'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = withDefaults(
  defineProps<{
    bars: ColumnChartBar[]
    /** Текущий период: акцентный столбец, жирная подпись, сумма над столбцом */
    currentIndex?: number | null
    /** Над каким столбцом писать сумму, если не над текущим (напр. над самым большим) */
    valueIndex?: number | null
    /** Подпись графика для скринридера: «Расходы по месяцам» */
    label: string
  }>(),
  { currentIndex: null, valueIndex: undefined },
)

const colors = useCssColors(COLUMN_CHART_COLOR_TOKENS)
const fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif'
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const valueIndex = computed(() =>
  props.valueIndex === undefined ? props.currentIndex : props.valueIndex,
)
const style = computed(() => ({
  currentIndex: props.currentIndex,
  colors: colors.value,
  fontFamily,
  reduceMotion,
}))
const chartData = computed(() => buildColumnChartData(props.bars, style.value))
const chartOptions = computed(() => buildColumnChartOptions(style.value))
const plugins = [
  createValueLabelPlugin(() => ({
    index: valueIndex.value,
    color: colors.value.text,
    fontFamily,
  })),
]
</script>

<template>
  <figure class="relative h-[184px] w-full">
    <Bar :data="chartData" :options="chartOptions" :plugins="plugins" :aria-label="label" />
    <figcaption class="sr-only">
      {{ label }}
      <ul>
        <li v-for="bar in bars" :key="bar.label">{{ bar.label }}: {{ formatMoney(bar.value) }}</li>
      </ul>
    </figcaption>
  </figure>
</template>
