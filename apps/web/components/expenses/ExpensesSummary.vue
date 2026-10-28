<script setup lang="ts">
import { computed } from 'vue'
import type { CarAnalytics } from '@garage/shared/types'
import { NBSP, formatMoney, formatNumber, todayIso } from '@garage/shared/utils/format'
import { formatMonthIn, type ExpensesQuery } from '~/utils/expensesPeriod'
import UiCard from '~/components/ui/Card.vue'
import UiRowKeyValue from '~/components/ui/RowKeyValue.vue'

/**
 * Сводка «Расходов» (Ж1/Ж3): сумма периода крупно (знак рубля мельче) и строки метрик из
 * аналитики. «Больше всего в …» — только для года и «Всё время» (в месяце оно равно самому месяцу).
 */
const props = defineProps<{
  analytics: Pick<CarAnalytics, 'total' | 'costPerKm' | 'avgEntry' | 'topMonth'>
  period: ExpensesQuery['period']
  today?: string
}>()

const RUBLE_SIGN = '₽'

const rows = computed(() => {
  const { analytics, period } = props
  const today = props.today ?? todayIso()
  return [
    analytics.costPerKm > 0
      ? {
          label: 'Стоимость километра',
          value: `${formatNumber(analytics.costPerKm, 1)}${NBSP}${RUBLE_SIGN}`,
        }
      : null,
    analytics.avgEntry > 0
      ? { label: 'Средняя запись', value: formatMoney(analytics.avgEntry) }
      : null,
    period !== 'month' && analytics.topMonth
      ? {
          label: `Больше всего ${formatMonthIn(analytics.topMonth.month, today)}`,
          value: formatMoney(analytics.topMonth.total),
        }
      : null,
  ].filter((row) => row !== null)
})
</script>

<template>
  <section class="flex flex-col gap-sp-6" aria-label="Итоги периода">
    <p class="text-display text-text" data-testid="expenses-total">
      {{ formatNumber(analytics.total)
      }}<span class="text-h1 text-text-2">{{ NBSP }}{{ RUBLE_SIGN }}</span>
    </p>
    <UiCard v-if="rows.length" data-testid="expenses-metrics">
      <UiRowKeyValue v-for="row in rows" :key="row.label" :label="row.label" :value="row.value" />
    </UiCard>
  </section>
</template>
