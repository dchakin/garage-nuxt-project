<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Суммы по периодам, слева направо */
    values: number[]
    /** Акцентный столбец (текущий период); по умолчанию последний */
    currentIndex?: number | null
  }>(),
  { currentIndex: undefined },
)

/** Высота области из макета (Chart/MiniBars) и минимальная высота пустого столбца, px */
const HEIGHT_PX = 44
const MIN_BAR_PX = 2

const accentIndex = computed(() =>
  props.currentIndex === undefined ? props.values.length - 1 : props.currentIndex,
)
const heights = computed(() => {
  const max = Math.max(...props.values, 0)
  return props.values.map((value) =>
    max > 0 ? Math.max(Math.round((value / max) * HEIGHT_PX), MIN_BAR_PX) : MIN_BAR_PX,
  )
})
</script>

<template>
  <div class="flex h-[44px] items-end gap-[5px]" aria-hidden="true">
    <span
      v-for="(height, index) in heights"
      :key="index"
      data-testid="mini-bar"
      class="w-[9px] rounded-b-[1px] rounded-t-[3px]"
      :class="index === accentIndex ? 'bg-chart-bar' : 'bg-chart-bar-muted'"
      :style="{ height: `${height}px` }"
    />
  </div>
</template>
