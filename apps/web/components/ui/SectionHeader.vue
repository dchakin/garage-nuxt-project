<script setup lang="ts">
import { resolveComponent } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

/** Заголовок секции экрана (h2) и необязательная ссылка справа («Все ›») */
const props = withDefaults(
  defineProps<{
    title: string
    to?: string
    linkLabel?: string
  }>(),
  { to: undefined, linkLabel: 'Все' },
)

// NuxtLink берётся только при ссылке: компонентные тесты монтируют заголовок без Nuxt
const NuxtLink = props.to ? resolveComponent('NuxtLink') : null
</script>

<template>
  <div class="flex min-h-tap-min items-center justify-between gap-sp-3">
    <h2 class="text-h2 text-text">{{ title }}</h2>
    <component
      :is="NuxtLink"
      v-if="NuxtLink"
      :to="to"
      class="-mr-sp-1 flex h-tap-min shrink-0 items-center gap-0.5 rounded-sm px-sp-1 text-body font-semibold text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
    >
      {{ linkLabel }}
      <ChevronRight class="h-[18px] w-[18px]" aria-hidden="true" />
    </component>
  </div>
</template>
