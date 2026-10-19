<script setup lang="ts">
import { NotebookPen, SearchX, TriangleAlert } from 'lucide-vue-next'
import type { EntryFilterInput, EntryType } from '@garage/shared/schemas/entry'
import type { Entry } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { groupEntriesByMonth } from '@garage/shared/utils/groupEntries'

// Журнал (В1–В6, Т2): записи по месяцам, чипы типов, поиск, порядок «по дате / по пробегу»
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300
/** Пауза после последнего символа поиска перед запросом, мс */
const SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { entries, fetchEntries } = useEntries(carId)

const today = todayIso()
const type = ref<EntryType | null>(null)
const searchInput = ref('')
const search = ref('')
const sortBy = ref<EntryFilterInput['sortBy']>('date')

const loading = ref(true)
const failed = ref(false)
const skeletonVisible = ref(false)
/** Машина, чьи записи уже загружены хотя бы раз: при сбое повторной загрузки их не стираем */
const loadedCarId = ref<number | null>(null)

const query = computed<Partial<EntryFilterInput>>(() => ({
  type: type.value ?? undefined,
  search: search.value.trim() || undefined,
  sortBy: sortBy.value,
}))
const hasFilters = computed(() => Boolean(query.value.type || query.value.search))
const loaded = computed(() => loadedCarId.value === carId.value && !failed.value)
const journalEmpty = computed(() => loaded.value && !entries.value.length && !hasFilters.value)
const nothingFound = computed(() => loaded.value && !entries.value.length && hasFilters.value)
/** При сортировке по пробегу месяцев нет — один плоский список */
const groups = computed(() => (sortBy.value === 'date' ? groupEntriesByMonth(entries.value) : []))

let skeletonTimer: ReturnType<typeof setTimeout> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined
let loadToken = 0

async function load() {
  const token = ++loadToken
  loading.value = true
  failed.value = false
  skeletonVisible.value = false
  clearTimeout(skeletonTimer)
  skeletonTimer = setTimeout(() => (skeletonVisible.value = true), SKELETON_DELAY_MS)
  try {
    await fetchEntries(query.value)
    if (token === loadToken) loadedCarId.value = carId.value
  } catch {
    // Уже показанные записи этой машины остаются (нет сети — плашка в layout), не экран ошибки
    if (token === loadToken && loadedCarId.value !== carId.value) failed.value = true
  } finally {
    if (token === loadToken) {
      loading.value = false
      clearTimeout(skeletonTimer)
    }
  }
}

function resetFilters() {
  type.value = null
  searchInput.value = ''
  search.value = ''
}

function openEntry(entry: Entry) {
  // Карточка записи в шторке (этап 7) заменит переход на страницу редактирования
  return navigateTo(`/cars/${carId.value}/entries/${entry.id}`)
}

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (search.value = value), SEARCH_DEBOUNCE_MS)
})
watch([carId, query], () => Number.isInteger(carId.value) && load(), { immediate: true })
onBeforeUnmount(() => {
  clearTimeout(skeletonTimer)
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="flex flex-col gap-sp-4 pt-sp-2" :aria-busy="loading">
    <h1 class="sr-only">Журнал</h1>

    <JournalFilters
      v-if="!journalEmpty && !failed"
      v-model:type="type"
      v-model:search="searchInput"
      v-model:sort-by="sortBy"
    />

    <UiCard v-if="failed" tag="section">
      <UiEmptyState
        :icon="TriangleAlert"
        tone="danger"
        title="Не удалось загрузить журнал"
        message="Проверьте соединение и попробуйте ещё раз."
      >
        <template #action>
          <UiButton variant="secondary" @click="load">Повторить</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>

    <UiCard v-else-if="journalEmpty" tag="section">
      <UiEmptyState
        :icon="NotebookPen"
        title="Записей пока нет"
        message="Добавьте первую запись кнопкой «＋» внизу — здесь появится история обслуживания и трат."
      />
    </UiCard>

    <UiCard v-else-if="nothingFound" tag="section">
      <UiEmptyState
        :icon="SearchX"
        title="Ничего не найдено"
        message="Попробуйте изменить запрос или сбросить фильтры."
      >
        <template #action>
          <UiButton variant="secondary" @click="resetFilters">Сбросить</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>

    <template v-else-if="loaded">
      <JournalMonthGroup
        v-for="group in groups"
        :key="group.month"
        :group="group"
        :today="today"
        @open="openEntry"
      />
      <UiCard v-if="sortBy === 'mileage'" tag="ul">
        <li v-for="entry in entries" :key="entry.id">
          <UiRowEntry :entry="entry" :today="today" @open="openEntry(entry)" />
        </li>
      </UiCard>
    </template>

    <template v-else-if="skeletonVisible">
      <UiSkeleton variant="line" class="h-4 w-[140px]" />
      <UiCard>
        <UiSkeleton v-for="row in 3" :key="`a${row}`" variant="row" />
      </UiCard>
      <UiSkeleton variant="line" class="h-4 w-[140px]" />
      <UiCard>
        <UiSkeleton v-for="row in 3" :key="`b${row}`" variant="row" />
      </UiCard>
    </template>
  </div>
</template>
