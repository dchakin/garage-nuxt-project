<script setup lang="ts">
import { computed } from 'vue'
import { CarFront, Check } from 'lucide-vue-next'
import type { Car } from '@garage/shared/types'
import { formatMileage } from '@garage/shared/utils/format'
import UiPlate from './Plate.vue'
import UiStatusBadge from './StatusBadge.vue'

/**
 * Машина в переключателе: отдельная карточка-кнопка (своя граница и скругление), выбранная —
 * с галочкой и `aria-current`. Бейдж: число просроченных; иначе ближайшее «скоро» с названием («ОСАГО через 5 дней»);
 * иначе «Всё в порядке». Пока счётчики не загружены (undefined), бейджа нет. Чужая машина — «· вы участник».
 */
const props = withDefaults(
  defineProps<{
    car: Pick<Car, 'brand' | 'model' | 'year' | 'plateNumber' | 'currentMileage'>
    selected?: boolean
    overdueCount?: number
    soonCount?: number
    /** Ближайшее «скоро» — название и остаток для бейджа */
    nextSoon?: { title: string; remaining: string } | null
    /** Машина чужая: после пробега «· вы участник» */
    isMember?: boolean
  }>(),
  { overdueCount: undefined, soonCount: undefined, nextSoon: null, isMember: false },
)

defineEmits<{ select: [] }>()

const carName = computed(() =>
  [`${props.car.brand} ${props.car.model}`, props.car.year].filter(Boolean).join(' · '),
)
const badge = computed(() => {
  const { overdueCount = 0, soonCount = 0, nextSoon } = props
  if (props.overdueCount === undefined && props.soonCount === undefined) return null
  if (overdueCount > 0) return { status: 'overdue' as const, text: `${overdueCount} просрочено` }
  if (soonCount > 0) {
    const text = nextSoon ? `${nextSoon.title} ${nextSoon.remaining}` : `${soonCount} скоро`
    return { status: 'soon' as const, text }
  }
  return { status: 'ok' as const, text: 'Всё в порядке' }
})
</script>

<template>
  <button
    type="button"
    :aria-current="selected ? 'true' : undefined"
    :class="selected ? 'border-accent ring-1 ring-inset ring-accent' : 'border-border'"
    class="flex w-full items-center gap-sp-3 rounded-lg border bg-surface py-sp-3 pl-sp-3 pr-sp-4 text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring active:bg-surface-2"
    @click="$emit('select')"
  >
    <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2">
      <CarFront class="h-6 w-6 text-text-2" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col items-start gap-1.5">
      <span class="w-full truncate text-body font-semibold text-text">{{ carName }}</span>
      <span class="flex items-center gap-sp-2">
        <UiPlate v-if="car.plateNumber" :plate-number="car.plateNumber" />
        <span class="whitespace-nowrap text-sm text-text-2">
          {{ formatMileage(car.currentMileage) }}{{ isMember ? ' · вы участник' : '' }}
        </span>
      </span>
      <UiStatusBadge v-if="badge" :status="badge.status">{{ badge.text }}</UiStatusBadge>
    </span>
    <Check v-if="selected" class="h-[22px] w-[22px] shrink-0 text-accent-text" aria-hidden="true" />
  </button>
</template>
