<script setup lang="ts">
import { computed } from 'vue'
import { Gauge } from 'lucide-vue-next'
import { formatNumber, formatTime } from '@garage/shared/utils/format'
import { formatMileageAge } from '~/utils/mileageAge'
import { useOnline } from '~/composables/useOnline'
import UiButton from '~/components/ui/Button.vue'
import UiCard from '~/components/ui/Card.vue'

/**
 * Карточка «Пробег» на Обзоре: крупный пробег, «обновлён N дней назад» (офлайн — «данные на 9:12 · офлайн») и кнопка «Обновить»
 * (событие `update` — страница открывает шторку Б5).
 */
const props = defineProps<{
  mileage: number
  /** `Car.mileageUpdatedAt` */
  updatedAt: string | null
  today?: string
}>()

defineEmits<{ update: [] }>()

const { online, lastOnlineAt } = useOnline()

/** Офлайн (Б3) вместо «обновлён …» — момент, на который данные на экране актуальны */
const age = computed(() =>
  online.value
    ? formatMileageAge(props.updatedAt, props.today)
    : `данные на ${formatTime(lastOnlineAt.value)} · офлайн`,
)
</script>

<template>
  <UiCard tag="section" aria-labelledby="overview-mileage-title">
    <div class="flex items-center justify-between gap-sp-3 p-sp-5">
      <div class="min-w-0">
        <h2 id="overview-mileage-title" class="text-sm text-text-2">Пробег</h2>
        <p class="text-amount text-text" data-testid="overview-mileage">
          {{ formatNumber(mileage) }}
          <span class="text-h3 text-text-2">км</span>
        </p>
        <p v-if="age" class="mt-sp-1 text-sm text-text-2">{{ age }}</p>
      </div>
      <UiButton variant="tonal" size="sm" :icon="Gauge" class="shrink-0" @click="$emit('update')">
        Обновить
      </UiButton>
    </div>
  </UiCard>
</template>
