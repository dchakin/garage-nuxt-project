<script setup lang="ts">
import { computed } from 'vue'
import type { ReminderStatus } from '@garage/shared/types'
import { reminderStatusLabels } from '@garage/shared/utils/reminderStatus'
import { reminderStatusStyles } from '~/utils/reminderStatusStyles'

/** Статус всегда = иконка + слово; слот заменяет слово («2 просрочено» у машины) */
const props = defineProps<{
  status: ReminderStatus
}>()

const style = computed(() => reminderStatusStyles[props.status])
</script>

<template>
  <span
    class="inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-sp-2 text-xs font-semibold"
    :class="[style.softClass, style.textClass]"
  >
    <component :is="style.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <slot>{{ reminderStatusLabels[status] }}</slot>
  </span>
</template>
