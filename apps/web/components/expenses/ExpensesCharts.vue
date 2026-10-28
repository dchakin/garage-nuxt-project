<script setup lang="ts">
import { computed } from 'vue'
import type { CarAnalytics } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { buildExpensesChart, type ExpensesQuery } from '~/utils/expensesPeriod'
import UiCategoryBar from '~/components/ui/CategoryBar.vue'
import UiColumnChart from '~/components/ui/ColumnChart.vue'

/**
 * Графики «Расходов» (Ж1), без карточек: столбцы «По месяцам» («По годам» для «Всё время») и
 * «По категориям». Над выбранным месяцем (или самым большим столбцом) стоит сумма, текущий
 * период — акцентный.
 */
const props = defineProps<{
  analytics: Pick<CarAnalytics, 'byMonth' | 'byCategory'>
  query: ExpensesQuery
  today?: string
}>()

const chart = computed(() =>
  buildExpensesChart(props.analytics, props.query, props.today ?? todayIso()),
)
const chartTitle = computed(() => (props.query.period === 'all' ? 'По годам' : 'По месяцам'))
</script>

<template>
  <div class="flex flex-col gap-sp-6">
    <section aria-labelledby="expenses-chart-title" class="flex flex-col gap-sp-3">
      <h2 id="expenses-chart-title" class="text-h2 text-text">{{ chartTitle }}</h2>
      <div data-testid="expenses-chart">
        <UiColumnChart
          :bars="chart.bars"
          :current-index="chart.currentIndex"
          :value-index="chart.valueIndex"
          :label="`Расходы: ${chartTitle.toLowerCase()}`"
        />
      </div>
    </section>

    <section
      v-if="analytics.byCategory.length"
      aria-labelledby="expenses-categories-title"
      class="flex flex-col gap-sp-2"
    >
      <h2 id="expenses-categories-title" class="text-h2 text-text">По категориям</h2>
      <ul data-testid="expenses-categories">
        <li v-for="category in analytics.byCategory" :key="category.categoryId ?? category.name">
          <UiCategoryBar :name="category.name" :amount="category.total" :share="category.share" />
        </li>
      </ul>
    </section>
  </div>
</template>
