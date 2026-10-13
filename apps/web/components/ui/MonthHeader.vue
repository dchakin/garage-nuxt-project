<script setup lang="ts">
import { formatMoney } from '@garage/shared/utils/format'

/** Заголовок месяца в журнале: название капителью слева, сумма за месяц справа */
defineProps<{
  /** «Сентябрь 2026» — заглавными делает CSS */
  title: string
  total?: number
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-sp-3 px-sp-1">
    <h3 class="text-xs font-semibold uppercase tracking-[0.8px] text-text-2">{{ title }}</h3>
    <span v-if="total !== undefined" class="whitespace-nowrap text-sm font-semibold text-text-2">
      {{ formatMoney(total) }}
    </span>
  </div>
</template>
