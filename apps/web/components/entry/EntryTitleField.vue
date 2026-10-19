<script setup lang="ts">
/** Поле «Что сделали» с подсказками из прошлых записей: тап по чипу подставляет описание. */
import { computed } from 'vue'
import type { Entry } from '@garage/shared/types'
import type { EntryType } from '@garage/shared/schemas/entry'
import { suggestEntryTitles } from '~/utils/entryTitleSuggestions'
import UiField from '~/components/ui/Field.vue'
import UiChip from '~/components/ui/Chip.vue'

const props = defineProps<{
  entries: Pick<Entry, 'description' | 'type' | 'date'>[]
  type?: EntryType | null
}>()

const model = defineModel<string>({ default: '' })

const suggestions = computed(() =>
  suggestEntryTitles(props.entries, { query: model.value, type: props.type }),
)
</script>

<template>
  <div class="flex flex-col gap-sp-2">
    <UiField v-model="model" label="Что сделали" placeholder="Например, замена масла" />
    <div v-if="suggestions.length" class="flex flex-wrap gap-sp-2" aria-label="Подсказки">
      <UiChip
        v-for="suggestion in suggestions"
        :key="suggestion"
        :selected="false"
        @click="model = suggestion"
      >
        {{ suggestion }}
      </UiChip>
    </div>
  </div>
</template>
