<script setup lang="ts">
import { computed } from 'vue'
import type { CarAnalytics } from '@garage/shared/types'
import { formatMoney, todayIso } from '@garage/shared/utils/format'
import UiCard from '~/components/ui/Card.vue'
import UiMiniBars from '~/components/ui/MiniBars.vue'

/**
 * «Расходы в октябре» на Обзоре (из аналитики `period=month`): сумма месяца, среднее
 * в месяц и мини-диаграмма последних месяцев, текущий — акцентный.
 */
const props = defineProps<{
  analytics: Pick<CarAnalytics, 'total' | 'avgPerMonth' | 'byMonth'>
  today?: string
}>()

/** Месяцы в предложном падеже: «Расходы в октябре» */
const MONTHS_PREPOSITIONAL = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
] as const

/** Сколько месяцев (включая текущий) рисует мини-диаграмма */
const MINI_BARS_MONTHS = 7

const currentMonth = computed(() => (props.today ?? todayIso()).slice(0, 7))
const title = computed(
  () => `Расходы в ${MONTHS_PREPOSITIONAL[Number(currentMonth.value.slice(5, 7)) - 1]}`,
)
const bars = computed(() => {
  const upToCurrent = props.analytics.byMonth.filter(({ month }) => month <= currentMonth.value)
  return upToCurrent.slice(-MINI_BARS_MONTHS).map(({ total }) => total)
})
</script>

<template>
  <UiCard tag="section" aria-labelledby="overview-expenses-title">
    <div class="flex items-end justify-between gap-sp-3 p-sp-5">
      <div class="min-w-0">
        <h2 id="overview-expenses-title" class="text-sm text-text-2">{{ title }}</h2>
        <p class="text-h1 text-text" data-testid="overview-month-total">
          {{ formatMoney(analytics.total) }}
        </p>
        <p v-if="analytics.avgPerMonth > 0" class="mt-sp-1 text-sm text-text-2">
          в среднем {{ formatMoney(analytics.avgPerMonth) }} в месяц
        </p>
      </div>
      <UiMiniBars v-if="bars.length" :values="bars" />
    </div>
  </UiCard>
</template>
