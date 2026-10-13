<script setup lang="ts">
import { computed } from 'vue'
import { entryTypeLabels } from '@garage/shared/schemas/entry'
import type { Entry } from '@garage/shared/types'
import { formatDate, formatMileage, formatMoney } from '@garage/shared/utils/format'
import UiTypeBadge from './TypeBadge.vue'

/**
 * Единая строка записи (журнал, «Последние записи», поиск). Вся строка нажимается → `open`,
 * своих кнопок нет. Заголовок = описание → категория → тип; мета = дата · пробег · место
 * (пустые части пропускаются).
 */
const props = defineProps<{
  entry: Pick<Entry, 'date' | 'type' | 'category' | 'description' | 'mileage' | 'cost' | 'place'>
  /** «Сегодня» для formatDate (год в дате — только если не текущий) */
  today?: string
}>()

defineEmits<{ open: [] }>()

const title = computed(
  () =>
    props.entry.description.trim() ||
    props.entry.category?.name ||
    entryTypeLabels[props.entry.type],
)
const amount = computed(() => (props.entry.cost === null ? '—' : formatMoney(props.entry.cost)))
const meta = computed(() =>
  [
    formatDate(props.entry.date, props.today),
    props.entry.mileage === null ? null : formatMileage(props.entry.mileage),
    props.entry.place?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · '),
)
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-sp-3 bg-surface py-sp-3 pl-[14px] pr-sp-4 text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus-ring active:bg-surface-2"
    @click="$emit('open')"
  >
    <UiTypeBadge :type="entry.type" />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex items-baseline gap-sp-2 text-body font-semibold text-text">
        <span class="min-w-0 flex-1 truncate">{{ title }}</span>
        <span class="shrink-0 whitespace-nowrap">{{ amount }}</span>
      </span>
      <span class="truncate text-sm text-text-2">{{ meta }}</span>
    </span>
  </button>
</template>
