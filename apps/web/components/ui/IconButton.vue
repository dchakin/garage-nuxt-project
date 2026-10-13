<script setup lang="ts">
import { resolveComponent, type Component } from 'vue'

const props = withDefaults(
  defineProps<{
    icon: Component
    /** Подпись для скринридера — у кнопки нет видимого текста */
    label: string
    /** plain — иконка 24 без фона (навигация), filled — 20 на surface-2 (действие в шапке) */
    variant?: 'plain' | 'filled'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    to?: string
  }>(),
  { variant: 'plain', type: 'button', to: undefined },
)

const NuxtLink = props.to ? resolveComponent('NuxtLink') : null
</script>

<template>
  <component
    :is="NuxtLink ?? 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled"
    :aria-label="label"
    :title="label"
    class="inline-flex h-tap-min w-tap-min shrink-0 items-center justify-center rounded-[12px] text-text transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring active:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
    :class="variant === 'filled' ? 'bg-surface-2' : ''"
  >
    <component
      :is="icon"
      :class="variant === 'filled' ? 'h-5 w-5' : 'h-6 w-6'"
      aria-hidden="true"
    />
  </component>
</template>
