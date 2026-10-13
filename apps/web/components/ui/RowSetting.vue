<script setup lang="ts">
import { resolveComponent, type Component } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

/** Строка настройки 56 px: иконка, подпись, текущее значение и шеврон; ссылка (`to`) или кнопка */
const props = withDefaults(
  defineProps<{
    label: string
    /** Текущее значение справа («Включены», «Как в системе») */
    value?: string
    icon?: Component
    to?: string
  }>(),
  { value: undefined, icon: undefined, to: undefined },
)

// NuxtLink берётся только для ссылок: компонентные тесты монтируют строку без Nuxt
const NuxtLink = props.to ? resolveComponent('NuxtLink') : null
</script>

<template>
  <component
    :is="NuxtLink ?? 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="flex h-14 w-full items-center gap-sp-3 bg-surface px-sp-4 text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus-ring active:bg-surface-2"
  >
    <component :is="icon" v-if="icon" class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate text-body text-text">{{ label }}</span>
    <span v-if="value" class="shrink-0 whitespace-nowrap text-body text-text-2">{{ value }}</span>
    <ChevronRight class="h-5 w-5 shrink-0 text-text-3" aria-hidden="true" />
  </component>
</template>
