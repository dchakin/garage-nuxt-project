<script setup lang="ts">
import { computed } from 'vue'
import type { CarAnalytics } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { buildExpensesChart, type ExpensesQuery } from '~/utils/expensesPeriod'
import UiCard from '~/components/ui/Card.vue'
import UiCategoryBar from '~/components/ui/CategoryBar.vue'
import UiColumnChart from '~/components/ui/ColumnChart.vue'

/**
 * Графики «Расходов» (Ж1): столбцы по месяцам (по годам для «Всё время») и «По категориям».
 * Над выбранным месяцем (или самым большим столбцом) стоит сумма, текущий период — акцентный.
 */
const props = defineProps<{
  analytics: Pick<CarAnalytics, 'byMonth' | 'byCategory'>
  query: ExpensesQuery
  today?: string
}>()

const chart = computed(() =>
  buildExpensesChart(props.analytics, props.query, props.today ?? todayIso()),
)
const chartLabel = computed(() =>
  props.query.period === 'all' ? 'Расходы по годам' : 'Расходы по месяцам',
)
</script>

<template>
  <div class="flex flex-col gap-sp-6">
    <section aria-labelledby="expenses-chart-title" class="flex flex-col gap-sp-3">
      <h2 id="expenses-chart-title" class="text-h2 text-text">{{ chartLabel }}</h2>
      <UiCard>
        <div class="p-sp-4" data-testid="expenses-chart">
          <UiColumnChart
            :bars="chart.bars"
            :current-index="chart.currentIndex"
            :value-index="chart.valueIndex"
            :label="chartLabel"
          />
        </div>
      </UiCard>
    </section>

    <section
      v-if="analytics.byCategory.length"
      aria-labelledby="expenses-categories-title"
      class="flex flex-col gap-sp-3"
    >
      <h2 id="expenses-categories-title" class="text-h2 text-text">По категориям</h2>
      <UiCard tag="ul" data-testid="expenses-categories">
        <li v-for="category in analytics.byCategory" :key="category.categoryId ?? category.name">
          <div class="px-sp-4">
            <UiCategoryBar :name="category.name" :amount="category.total" :share="category.share" />
          </div>
        </li>
      </UiCard>
    </section>
  </div>
</template>
