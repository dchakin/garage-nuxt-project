<script setup lang="ts">
/**
 * Список категорий одной группы (З3): название и число записей. У своих категорий (`editable`)
 * справа кнопки «Переименовать» и «Удалить» (запросы и диалог — у родителя), у стандартных
 * действий нет.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import { formatNumber, pluralize } from '@garage/shared/utils/format'
import type { CarCategory } from '~/composables/useCategories'

const ENTRIES_FORMS: [string, string, string] = ['запись', 'записи', 'записей']

defineProps<{
  title: string
  categories: CarCategory[]
  editable?: boolean
  testId: string
}>()
const emit = defineEmits<{ rename: [category: CarCategory]; remove: [category: CarCategory] }>()

function describeCount(count: number) {
  return count ? `${formatNumber(count)} ${pluralize(count, ENTRIES_FORMS)}` : 'Нет записей'
}
</script>

<template>
  <section class="flex flex-col gap-sp-2" :aria-label="title" :data-testid="testId">
    <h2 class="text-xs font-semibold uppercase text-text-2">{{ title }}</h2>
    <UiCard tag="ul">
      <li
        v-for="category in categories"
        :key="category.id"
        class="flex min-h-14 items-center gap-sp-3 bg-surface py-sp-2 pl-sp-4"
        :class="editable ? 'pr-sp-1' : 'pr-sp-4'"
        data-testid="category-row"
      >
        <span class="min-w-0 flex-1 truncate text-body text-text">{{ category.name }}</span>
        <span class="shrink-0 text-sm text-text-2">{{ describeCount(category.entriesCount) }}</span>
        <template v-if="editable">
          <UiIconButton
            :icon="Pencil"
            :label="`Переименовать категорию ${category.name}`"
            @click="emit('rename', category)"
          />
          <UiIconButton
            :icon="Trash2"
            :label="`Удалить категорию ${category.name}`"
            @click="emit('remove', category)"
          />
        </template>
      </li>
    </UiCard>
  </section>
</template>
