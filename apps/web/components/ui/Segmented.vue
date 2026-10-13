<script setup lang="ts" generic="T extends string | number">
import { ref } from 'vue'

const props = defineProps<{
  options: { value: T; label: string }[]
  /** Подпись группы для скринридера */
  label?: string
}>()

const model = defineModel<T>({ required: true })
const buttons = ref<HTMLButtonElement[]>([])

function select(value: T) {
  if (value !== model.value) model.value = value
}

// Стрелки переключают вариант, как в нативной группе радиокнопок
function onKeydown(event: KeyboardEvent, index: number) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const next = (index + step + props.options.length) % props.options.length
  select(props.options[next]!.value)
  buttons.value[next]?.focus()
}
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex gap-1 rounded-md bg-surface-2 p-1">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="option.value === model"
      :tabindex="option.value === model ? 0 : -1"
      class="h-9 min-w-0 flex-1 truncate rounded-sm px-2 text-sm transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      :class="
        option.value === model
          ? 'bg-surface font-semibold text-text shadow-sm'
          : 'font-medium text-text-2 active:text-text'
      "
      @click="select(option.value)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
