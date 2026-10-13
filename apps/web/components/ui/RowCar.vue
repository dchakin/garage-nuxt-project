<script setup lang="ts">
import { computed } from 'vue'
import { Car as CarIcon, Check } from 'lucide-vue-next'
import type { Car } from '@garage/shared/types'
import { formatMileage } from '@garage/shared/utils/format'
import UiPlate from './Plate.vue'
import UiStatusBadge from './StatusBadge.vue'

/**
 * Машина в переключателе: отдельная карточка-кнопка (своя граница и скругление), выбранная —
 * с галочкой и `aria-current`. Бейдж — число просроченных, иначе «скоро», иначе нет.
 */
const props = withDefaults(
  defineProps<{
    car: Pick<Car, 'brand' | 'model' | 'year' | 'plateNumber' | 'currentMileage'>
    selected?: boolean
    overdueCount?: number
    soonCount?: number
  }>(),
  { overdueCount: 0, soonCount: 0 },
)

defineEmits<{ select: [] }>()

const carName = computed(() =>
  [`${props.car.brand} ${props.car.model}`, props.car.year].filter(Boolean).join(' · '),
)
const badge = computed(() => {
  if (props.overdueCount > 0)
    return { status: 'overdue' as const, text: `${props.overdueCount} просрочено` }
  if (props.soonCount > 0) return { status: 'soon' as const, text: `${props.soonCount} скоро` }
  return null
})
</script>

<template>
  <button
    type="button"
    :aria-current="selected ? 'true' : undefined"
    class="flex w-full items-center gap-sp-3 rounded-lg border border-border bg-surface py-sp-3 pl-sp-3 pr-sp-4 text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring active:bg-surface-2"
    @click="$emit('select')"
  >
    <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2">
      <CarIcon class="h-6 w-6 text-text-2" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col items-start gap-1.5">
      <span class="w-full truncate text-body font-semibold text-text">{{ carName }}</span>
      <span class="flex items-center gap-sp-2">
        <UiPlate v-if="car.plateNumber" :plate-number="car.plateNumber" />
        <span class="whitespace-nowrap text-sm text-text-2">
          {{ formatMileage(car.currentMileage) }}
        </span>
      </span>
      <UiStatusBadge v-if="badge" :status="badge.status">{{ badge.text }}</UiStatusBadge>
    </span>
    <Check v-if="selected" class="h-[22px] w-[22px] shrink-0 text-accent-text" aria-hidden="true" />
  </button>
</template>
