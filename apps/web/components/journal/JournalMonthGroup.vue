<script setup lang="ts">
import type { Entry } from '@garage/shared/types'
import { formatMonthYear } from '@garage/shared/utils/format'
import type { EntryMonthGroup } from '@garage/shared/utils/groupEntries'
import UiCard from '~/components/ui/Card.vue'
import UiMonthHeader from '~/components/ui/MonthHeader.vue'
import UiRowEntry from '~/components/ui/RowEntry.vue'

/** Месяц журнала: заголовок с суммой (год — только не текущий) и карточка со строками записей. */
defineProps<{
  group: EntryMonthGroup<Entry>
  today?: string
}>()

defineEmits<{ open: [entry: Entry] }>()
</script>

<template>
  <section class="flex flex-col gap-sp-2" :data-month="group.month">
    <UiMonthHeader :title="formatMonthYear(group.month, today)" :total="group.total" />
    <UiCard tag="ul">
      <li v-for="entry in group.entries" :key="entry.id">
        <UiRowEntry :entry="entry" :today="today" @open="$emit('open', entry)" />
      </li>
    </UiCard>
  </section>
</template>
