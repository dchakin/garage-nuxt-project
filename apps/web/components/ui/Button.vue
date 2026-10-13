<script setup lang="ts">
import { computed, resolveComponent, type Component } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'text' | 'danger-text'
export type ButtonSize = 'md' | 'sm'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    /** md — 52 px (control-h), sm — 44 px: действие внутри карточки («Сделал») */
    size?: ButtonSize
    /** Иконка слева от подписи (компонент lucide-vue-next) */
    icon?: Component
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** Крутилка вместо иконки, кнопка недоступна; подпись («Сохраняем…») задаёт вызывающий */
    loading?: boolean
    /** Ссылка вместо кнопки (NuxtLink) */
    to?: string
  }>(),
  { variant: 'primary', size: 'md', icon: undefined, type: 'button', to: undefined },
)

// NuxtLink берётся только для ссылок: компонентные тесты монтируют кнопку без Nuxt
const NuxtLink = props.to ? resolveComponent('NuxtLink') : null

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent active:bg-accent-pressed',
  secondary: 'border border-border-strong bg-surface text-text active:bg-surface-3',
  tonal: 'bg-accent-soft text-accent-text active:bg-surface-3',
  danger: 'bg-danger text-on-danger active:bg-danger-pressed',
  text: 'text-accent-text active:bg-accent-soft',
  'danger-text': 'text-danger-text active:bg-danger-soft',
}

const isTextVariant = computed(() => props.variant === 'text' || props.variant === 'danger-text')
const isInactive = computed(() => props.disabled || props.loading)

const sizeClass = computed(() => {
  if (isTextVariant.value) return 'h-tap-min px-2 text-body'
  return props.size === 'sm' ? 'h-tap-min px-[14px] text-sm' : 'h-control-h px-5 text-body'
})
</script>

<template>
  <component
    :is="NuxtLink ?? 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : isInactive"
    :aria-disabled="to && isInactive ? 'true' : undefined"
    :aria-busy="loading || undefined"
    class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40"
    :class="[VARIANT_CLASSES[variant], sizeClass]"
  >
    <LoaderCircle v-if="loading" class="h-5 w-5 animate-spin" aria-hidden="true" />
    <component
      :is="icon"
      v-else-if="icon"
      :class="size === 'sm' && !isTextVariant ? 'h-[18px] w-[18px]' : 'h-5 w-5'"
      aria-hidden="true"
    />
    <slot />
  </component>
</template>
