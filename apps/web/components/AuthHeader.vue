<script setup lang="ts">
/**
 * Шапка экранов входа и восстановления пароля, по левому краю: плитка логотипа 72 px (или стрелка
 * «назад» вместо неё, если задан `backTo`; `hideLogo` — вовсе без неё), заголовок h1 и подпись.
 */
import { ArrowLeft } from 'lucide-vue-next'

defineProps<{
  title: string
  subtitle?: string
  /** Ссылка «назад» вместо логотипа (А7) */
  backTo?: string
  /** Без плитки логотипа (А9: сверху плашка, логотипа в макете нет) */
  hideLogo?: boolean
}>()
</script>

<template>
  <header class="mb-sp-8 flex flex-col items-start">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="-ml-sp-2 mb-sp-8 flex h-tap-min w-tap-min items-center justify-center rounded-md text-text"
      aria-label="Назад"
    >
      <ArrowLeft class="h-6 w-6" aria-hidden="true" />
    </NuxtLink>
    <img
      v-else-if="!hideLogo"
      src="/logo.svg"
      alt=""
      width="72"
      height="72"
      class="mb-sp-6 h-[72px] w-[72px] rounded-[20px]"
    />
    <h1 class="text-h1 text-text">{{ title }}</h1>
    <p v-if="subtitle" class="mt-sp-3 text-body text-text-2">{{ subtitle }}</p>
  </header>
</template>
