<script setup lang="ts">
import { computed } from 'vue'
import type { CarAnalytics } from '@garage/shared/types'
import { formatCostPerKm, formatMoney, todayIso } from '@garage/shared/utils/format'
import { formatMonthIn, type ExpensesQuery } from '~/utils/expensesPeriod'
import UiCard from '~/components/ui/Card.vue'
import UiRowKeyValue from '~/components/ui/RowKeyValue.vue'

/**
 * Сводка «Расходов» (Ж1): сумма периода и строки метрик из аналитики. «В среднем в месяц»
 * и «Больше всего в …» — только для года и «Всё время» (в месяце они равны самому месяцу).
 */
const props = defineProps<{
  analytics: Pick<CarAnalytics, 'total' | 'avgPerMonth' | 'costPerKm' | 'avgEntry' | 'topMonth'>
  period: ExpensesQuery['period']
  today?: string
}>()

const rows = computed(() => {
  const { analytics, period } = props
  const today = props.today ?? todayIso()
  const isWholeSpan = period !== 'month'
  return [
    isWholeSpan && analytics.avgPerMonth > 0
      ? { label: 'В среднем в месяц', value: formatMoney(analytics.avgPerMonth) }
      : null,
    analytics.costPerKm > 0
      ? { label: 'Стоимость километра', value: formatCostPerKm(analytics.costPerKm) }
      : null,
    analytics.avgEntry > 0
      ? { label: 'Средняя запись', value: formatMoney(analytics.avgEntry) }
      : null,
    isWholeSpan && analytics.topMonth
      ? {
          label: `Больше всего ${formatMonthIn(analytics.topMonth.month, today)}`,
          value: formatMoney(analytics.topMonth.total),
        }
      : null,
  ].filter((row) => row !== null)
})
</script>

<template>
  <section class="flex flex-col gap-sp-4" aria-labelledby="expenses-total-title">
    <div>
      <h2 id="expenses-total-title" class="text-sm text-text-2">Потрачено</h2>
      <p class="text-amount text-text" data-testid="expenses-total">
        {{ formatMoney(analytics.total) }}
      </p>
    </div>
    <UiCard v-if="rows.length" data-testid="expenses-metrics">
      <UiRowKeyValue v-for="row in rows" :key="row.label" :label="row.label" :value="row.value" />
    </UiCard>
  </section>
</template>
