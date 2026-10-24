<script setup lang="ts">
/** Шапка экранов входа и регистрации: плитка с логотипом, заголовок h1 и подпись. */
import { CarFront } from 'lucide-vue-next'

defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="mb-sp-6 flex flex-col items-center text-center">
    <span
      class="mb-sp-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent text-on-accent"
    >
      <CarFront class="h-7 w-7" aria-hidden="true" />
    </span>
    <h1 class="text-h1 text-text">{{ title }}</h1>
    <p v-if="subtitle" class="mt-sp-2 text-body text-text-2">{{ subtitle }}</p>
  </header>
</template>
