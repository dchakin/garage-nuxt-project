<script setup lang="ts">
import { computed } from 'vue'
import { NotebookPen, Plus } from 'lucide-vue-next'
import type { Entry } from '@garage/shared/types'
import UiButton from '~/components/ui/Button.vue'
import UiCard from '~/components/ui/Card.vue'
import UiEmptyState from '~/components/ui/EmptyState.vue'
import UiRowEntry from '~/components/ui/RowEntry.vue'
import UiSectionHeader from '~/components/ui/SectionHeader.vue'

/**
 * «Последние записи» на Обзоре: три самые свежие и ссылка «Журнал». Нет записей — секция «Журнал»
 * с пустым состоянием и кнопкой «Добавить запись» (`add` — страница открывает шторку новой записи).
 * Тап по строке эмитит `open` (страница открывает шторку записи).
 */
const props = defineProps<{
  carId: number
  /** Новые сверху, как отдаёт API */
  entries: Entry[]
  today?: string
}>()

defineEmits<{ open: [entry: Entry]; add: [] }>()

const RECENT_LIMIT = 3

const recent = computed(() => props.entries.slice(0, RECENT_LIMIT))
</script>

<template>
  <section>
    <UiSectionHeader
      :title="recent.length ? 'Последние записи' : 'Журнал'"
      :to="entries.length ? `/cars/${carId}/journal` : undefined"
      link-label="Журнал"
    />
    <UiCard v-if="recent.length" tag="ul" class="mt-sp-2">
      <li v-for="entry in recent" :key="entry.id">
        <UiRowEntry :entry="entry" :today="today" @open="$emit('open', entry)" />
      </li>
    </UiCard>
    <UiCard v-else class="mt-sp-2">
      <UiEmptyState
        :icon="NotebookPen"
        title="Здесь будет история машины"
        message="Запишите последнее ТО или покупку — это займёт 20 секунд. Кнопка «＋» внизу работает с любого экрана."
      >
        <template #action>
          <UiButton :icon="Plus" @click="$emit('add')">Добавить запись</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>
  </section>
</template>
