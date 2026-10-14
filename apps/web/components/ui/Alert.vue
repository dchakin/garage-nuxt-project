<script setup lang="ts">
/**
 * Встроенное сообщение в потоке экрана: ошибка сервера в форме, «нет сети», подсказка про push.
 * Не для успеха после действия — для этого toast. Текст — `message` или слот по умолчанию,
 * кнопки под текстом — слот `actions`. `error` объявляется скринридеру сразу (`role="alert"`).
 */
import { computed, type Component } from 'vue'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-vue-next'

export type AlertVariant = 'error' | 'warning' | 'success' | 'info'

const props = withDefaults(
  defineProps<{
    variant: AlertVariant
    title: string
    message?: string
    /** Замена иконки варианта (`WifiOff` для «Нет соединения», `PartyPopper`) */
    icon?: Component
  }>(),
  { message: undefined, icon: undefined },
)

const VARIANT_STYLES: Record<AlertVariant, { icon: Component; box: string; accent: string }> = {
  error: { icon: CircleAlert, box: 'bg-danger-soft', accent: 'text-danger-text' },
  warning: { icon: TriangleAlert, box: 'bg-warning-soft', accent: 'text-warning-text' },
  success: { icon: CircleCheck, box: 'bg-success-soft', accent: 'text-success-text' },
  info: { icon: Info, box: 'bg-info-soft', accent: 'text-info-text' },
}

const style = computed(() => VARIANT_STYLES[props.variant])
</script>

<template>
  <div
    :role="variant === 'error' ? 'alert' : 'status'"
    class="flex gap-[10px] rounded-md px-[14px] py-sp-3"
    :class="style.box"
    :data-variant="variant"
  >
    <component
      :is="icon ?? style.icon"
      class="mt-px h-5 w-5 shrink-0"
      :class="style.accent"
      aria-hidden="true"
    />
    <div class="min-w-0 flex-1">
      <p class="text-body font-semibold" :class="style.accent">{{ title }}</p>
      <div v-if="message || $slots.default" class="mt-0.5 text-sm text-text">
        <slot>{{ message }}</slot>
      </div>
      <div v-if="$slots.actions" class="mt-sp-3 flex flex-wrap gap-sp-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
