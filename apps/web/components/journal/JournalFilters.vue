<script setup lang="ts">
import { entryTypes, entryTypeShortLabels, type EntryType } from '@garage/shared/schemas/entry'
import UiChip from '~/components/ui/Chip.vue'
import UiSearchField from '~/components/ui/SearchField.vue'
import { entryTypeIcons } from '~/utils/entryTypeIcons'

/**
 * Поиск и чипы типов («Все» + пять типов в порядке `entryTypes`). Состояние держит страница:
 * `type` — выбранный тип или `null`, `search` — текст поля (отправку откладывает страница).
 */
const type = defineModel<EntryType | null>('type', { required: true })
const search = defineModel<string>('search', { required: true })
</script>

<template>
  <div class="flex flex-col gap-sp-3" data-testid="journal-filters">
    <UiSearchField v-model="search" placeholder="Поиск по записям" />
    <div
      role="group"
      aria-label="Тип записи"
      class="-mx-sp-4 flex gap-sp-2 overflow-x-auto px-sp-4 pb-px scrollbar-hidden"
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
  </div>
</template>
