<script setup lang="ts">
import { computed } from 'vue'
import { NotebookPen } from 'lucide-vue-next'
import type { Entry } from '@garage/shared/types'
import UiCard from '~/components/ui/Card.vue'
import UiEmptyState from '~/components/ui/EmptyState.vue'
import UiRowEntry from '~/components/ui/RowEntry.vue'
import UiSectionHeader from '~/components/ui/SectionHeader.vue'

/**
 * «Последние записи» на Обзоре: три самые свежие и ссылка «Журнал». Нет записей — пустое
 * состояние. Тап по строке подключится в этапе 7 (карточка записи).
 */
const props = defineProps<{
  carId: number
  /** Новые сверху, как отдаёт API */
  entries: Entry[]
  today?: string
}>()

const RECENT_LIMIT = 3

const recent = computed(() => props.entries.slice(0, RECENT_LIMIT))
</script>

<template>
  <section>
    <UiSectionHeader
      title="Последние записи"
      :to="entries.length ? `/cars/${carId}/journal` : undefined"
      link-label="Журнал"
    />
    <UiCard v-if="recent.length" tag="ul" class="mt-sp-2">
      <li v-for="entry in recent" :key="entry.id">
        <UiRowEntry :entry="entry" :today="today" />
      </li>
    </UiCard>
    <UiCard v-else class="mt-sp-2">
      <UiEmptyState
        :icon="NotebookPen"
        title="Записей пока нет"
        message="Добавьте первую запись кнопкой «＋» внизу — здесь появятся последние траты и работы."
      />
    </UiCard>
  </section>
</template>
