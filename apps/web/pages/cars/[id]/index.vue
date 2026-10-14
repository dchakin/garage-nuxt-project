<script setup lang="ts">
import { formatMileage } from '@garage/shared/utils/format'

// Экран «Обзор» (Б1) наполняется в #52; пока — пробег текущей машины
definePageMeta({ middleware: 'auth', layout: 'car' })

const { car } = useCurrentCar()
</script>

<template>
  <div>
    <h1 class="sr-only">Обзор</h1>
    <UiCard>
      <div class="p-sp-5">
        <p class="text-sm text-text-2">Пробег</p>
        <p v-if="car" class="text-amount text-text">{{ formatMileage(car.currentMileage) }}</p>
        <UiSkeleton v-else variant="line" class="mt-sp-2 h-9 w-[180px]" />
      </div>
    </UiCard>
  </div>
</template>
