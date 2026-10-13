<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import UiIconButton from './IconButton.vue'

const props = defineProps<{
  /** Текущий период: «Сентябрь 2026», «2026 год» */
  label: string
  canPrev: boolean
  canNext: boolean
}>()

const emit = defineEmits<{ prev: []; next: [] }>()

function goPrev() {
  if (props.canPrev) emit('prev')
}

function goNext() {
  if (props.canNext) emit('next')
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UiIconButton
      :icon="ChevronLeft"
      label="Предыдущий период"
      :disabled="!canPrev"
      @click="goPrev"
    />
    <span class="text-h3 text-text" aria-live="polite">{{ label }}</span>
    <UiIconButton
      :icon="ChevronRight"
      label="Следующий период"
      :disabled="!canNext"
      @click="goNext"
    />
  </div>
</template>
