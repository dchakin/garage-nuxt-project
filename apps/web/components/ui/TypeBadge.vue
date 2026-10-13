<script setup lang="ts">
import { computed } from 'vue'
import { entryTypeLabels, type EntryType } from '@garage/shared/schemas/entry'
import { entryTypeIcons } from '~/utils/entryTypeIcons'

/** Плитка типа: 40×40, soft-фон + иконка цвета типа; название — для скринридера */
const props = defineProps<{
  type: EntryType
}>()

const typeIcon = computed(() => entryTypeIcons[props.type])
</script>

<template>
  <span
    role="img"
    :aria-label="entryTypeLabels[type]"
    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
    :class="typeIcon.softClass"
  >
    <component
      :is="typeIcon.icon"
      class="h-5 w-5"
      :class="typeIcon.colorClass"
      aria-hidden="true"
    />
  </span>
</template>
