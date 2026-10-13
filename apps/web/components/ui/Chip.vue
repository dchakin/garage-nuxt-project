<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Выбран ли чип, если состояние держит родитель (один из группы: «Все», «Ремонт»…) */
    selected?: boolean
    /** Иконка слева, 16 px */
    icon?: Component
    /** Цвет иконки в невыбранном чипе (например, `text-type-service`) */
    iconClass?: string
    /** v-model — для чипа-переключателя; без него состояние задаёт `selected` */
    modelValue?: boolean
  }>(),
  { icon: undefined, iconClass: 'text-text-2', modelValue: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

// Не defineModel: без v-model он держал бы локальную копию, и она перекрыла бы `selected`
const isSelected = computed(() => props.modelValue ?? props.selected)

function toggle() {
  emit('update:modelValue', !isSelected.value)
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="isSelected"
    class="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-[14px] text-sm transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-40"
    :class="
      isSelected
        ? 'bg-inverse font-semibold text-on-inverse'
        : 'border border-border bg-surface font-medium text-text active:bg-surface-3'
    "
    @click="toggle"
  >
    <component
      :is="icon"
      v-if="icon"
      class="h-4 w-4 shrink-0"
      :class="isSelected ? 'text-on-inverse' : iconClass"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
