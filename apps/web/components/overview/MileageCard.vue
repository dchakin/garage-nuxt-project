<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@garage/shared/utils/format'
import { formatMileageAge } from '~/utils/mileageAge'
import UiButton from '~/components/ui/Button.vue'
import UiCard from '~/components/ui/Card.vue'

/**
 * Карточка «Пробег» на Обзоре: крупный пробег, «обновлён N дней назад» и кнопка «Обновить»
 * (событие `update` — страница открывает шторку Б5).
 */
const props = defineProps<{
  mileage: number
  /** `Car.mileageUpdatedAt` */
  updatedAt: string | null
  today?: string
}>()

defineEmits<{ update: [] }>()

const age = computed(() => formatMileageAge(props.updatedAt, props.today))
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
      <UiButton variant="secondary" size="sm" class="shrink-0" @click="$emit('update')">
        Обновить
      </UiButton>
    </div>
  </UiCard>
</template>
