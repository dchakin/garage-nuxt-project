<script setup lang="ts">
import {
  entryTypes,
  entryTypeShortLabels,
  type EntryFilterInput,
  type EntryType,
} from '@garage/shared/schemas/entry'
import UiChip from '~/components/ui/Chip.vue'
import UiSearchField from '~/components/ui/SearchField.vue'
import UiSegmented from '~/components/ui/Segmented.vue'
import { entryTypeIcons } from '~/utils/entryTypeIcons'

/**
 * Поиск, чипы типов («Все» + пять типов) и порядок списка журнала. Состояние держит страница:
 * `type` — выбранный тип или `null`, `search` — текст поля (отправку откладывает страница).
 */
type JournalSort = EntryFilterInput['sortBy']

const type = defineModel<EntryType | null>('type', { required: true })
const search = defineModel<string>('search', { required: true })
const sortBy = defineModel<JournalSort>('sortBy', { required: true })

const SORT_OPTIONS: { value: JournalSort; label: string }[] = [
  { value: 'date', label: 'По дате' },
  { value: 'mileage', label: 'По пробегу' },
]
</script>

<template>
  <div class="flex flex-col gap-sp-3" data-testid="journal-filters">
    <UiSearchField v-model="search" placeholder="Поиск по описанию и месту" />
    <div
      role="group"
      aria-label="Тип записи"
      class="-mx-sp-4 flex gap-sp-2 overflow-x-auto px-sp-4 pb-px"
    >
      <UiChip :selected="type === null" @click="type = null">Все</UiChip>
      <UiChip
        v-for="entryType in entryTypes"
        :key="entryType"
        :selected="type === entryType"
        :icon="entryTypeIcons[entryType].icon"
        :icon-class="entryTypeIcons[entryType].colorClass"
        @click="type = entryType"
      >
        {{ entryTypeShortLabels[entryType] }}
      </UiChip>
    </div>
    <UiSegmented v-model="sortBy" :options="SORT_OPTIONS" label="Порядок записей" />
  </div>
</template>
