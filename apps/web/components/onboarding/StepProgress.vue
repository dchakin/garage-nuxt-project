<script setup lang="ts">
/**
 * Полоса прогресса мастера первого запуска: `total` сегментов, первые `step` закрашены.
 * Декоративна: номер шага произносит подпись «Шаг N из M» рядом.
 */
defineProps<{ step: number; total: number }>()
</script>

<template>
  <div class="flex gap-sp-2" aria-hidden="true" data-testid="onboarding-progress">
    <span
      v-for="segment in total"
      :key="segment"
      class="h-1 flex-1 rounded-full transition-colors duration-base"
      :class="segment <= step ? 'bg-accent' : 'bg-border'"
      :data-filled="segment <= step"
    />
  </div>
</template>
