<script setup lang="ts">
import { computed } from 'vue'
import { NBSP, formatMoney } from '@garage/shared/utils/format'

const props = defineProps<{
  /** Название категории */
  name: string
  /** Сумма, ₽ */
  amount: number
  /** Доля в процентах (целое из аналитики, сумма по категориям = 100); вне 0…100 обрезается */
  share: number
}>()

const width = computed(() => `${Math.min(Math.max(props.share, 0), 100)}%`)
</script>

<template>
  <div class="space-y-sp-2 py-[10px]">
    <div class="flex items-center gap-sp-2">
      <span class="min-w-0 flex-1 truncate text-body font-medium text-text">{{ name }}</span>
      <span class="text-sm text-text-2">{{ share }}{{ NBSP }}%</span>
      <span class="text-body font-semibold text-text">{{ formatMoney(amount) }}</span>
    </div>
    <div class="h-2 overflow-hidden rounded-[4px] bg-surface-2" aria-hidden="true">
      <div
        data-testid="category-bar-fill"
        class="h-full origin-left animate-grow-x rounded-[4px] bg-chart-bar transition-[width] duration-slow ease-standard motion-reduce:animate-none motion-reduce:transition-none"
        :style="{ width }"
      />
    </div>
  </div>
</template>
