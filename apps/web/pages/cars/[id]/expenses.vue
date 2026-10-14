<script setup lang="ts">
import { ChartColumn } from 'lucide-vue-next'

// Экран «Расходы» — этап 9
definePageMeta({ middleware: 'auth', layout: 'car' })
</script>

<template>
  <div>
    <h1 class="sr-only">Расходы</h1>
    <UiCard>
      <UiEmptyState
        :icon="ChartColumn"
        title="Расходы скоро появятся"
        message="Здесь будут траты по месяцам и категориям."
      />
    </UiCard>
  </div>
</template>
