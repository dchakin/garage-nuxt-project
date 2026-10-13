<script setup lang="ts">
import { computed } from 'vue'
import { entryTypeShortLabels, type EntryType } from '@garage/shared/schemas/entry'
import { entryTypeIcons } from '~/utils/entryTypeIcons'

const props = defineProps<{
  type: EntryType
}>()

/** Выбранный тип в группе: `<UiTypeOption v-for="t in entryTypes" :type="t" v-model="form.type" />` */
const model = defineModel<EntryType | null>()

const selected = computed(() => model.value === props.type)
const typeIcon = computed(() => entryTypeIcons[props.type])
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="selected"
    class="flex h-[76px] min-w-[66px] flex-col items-center gap-1.5 rounded-md border px-1 pb-2 pt-[10px] transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
    :class="
      selected
        ? 'border-accent bg-accent-soft ring-1 ring-inset ring-accent'
        : 'border-border bg-surface active:bg-surface-3'
    "
    @click="model = type"
  >
    <span
      class="flex h-8 w-8 items-center justify-center rounded-[9px]"
      :class="typeIcon.softClass"
      aria-hidden="true"
    >
      <component :is="typeIcon.icon" class="h-[18px] w-[18px]" :class="typeIcon.colorClass" />
    </span>
    <span class="w-full truncate text-center text-xs font-semibold text-text">
      {{ entryTypeShortLabels[type] }}
    </span>
  </button>
</template>
