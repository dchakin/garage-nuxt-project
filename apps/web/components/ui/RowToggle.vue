<script setup lang="ts">
import { useId } from 'vue'
import UiToggle from './Toggle.vue'

/** Строка с переключателем (настройки, шаблоны напоминаний); заголовок подписывает переключатель */
withDefaults(
  defineProps<{
    title: string
    /** Вторая строка: «Каждые 10 000 км или 12 мес» */
    subtitle?: string
    disabled?: boolean
    tone?: 'accent' | 'success'
  }>(),
  { subtitle: undefined, tone: 'accent' },
)

const model = defineModel<boolean>({ default: false })
const titleId = useId()
</script>

<template>
  <div class="flex items-center gap-sp-3 bg-surface px-sp-4 py-[14px]">
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span :id="titleId" class="text-body font-semibold text-text">{{ title }}</span>
      <span v-if="subtitle" class="text-sm text-text-2">{{ subtitle }}</span>
    </span>
    <UiToggle v-model="model" :aria-labelledby="titleId" :disabled="disabled" :tone="tone" />
  </div>
</template>
