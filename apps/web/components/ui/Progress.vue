<script setup lang="ts">
import { computed } from 'vue'
import type { ReminderStatus } from '@garage/shared/types'
import { reminderStatusStyles } from '~/utils/reminderStatusStyles'

const props = withDefaults(
  defineProps<{
    /** Доля 0…1; вне диапазона обрезается */
    value: number
    /** Цвет заливки — по статусу напоминания или акцент */
    tone?: ReminderStatus | 'accent'
    /** Подпись для скринридера */
    label?: string
  }>(),
  { tone: 'accent', label: undefined },
)

const percent = computed(() => Math.round(Math.min(Math.max(props.value, 0), 1) * 100))
const barClass = computed(() =>
  props.tone === 'accent' ? 'bg-accent' : reminderStatusStyles[props.tone].barClass,
)
</script>

<template>
  <div
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
    :aria-label="label"
    class="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
  >
    <div
      class="h-full rounded-full transition-[width] duration-base ease-standard"
      :class="barClass"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
