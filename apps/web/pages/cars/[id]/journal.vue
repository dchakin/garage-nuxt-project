<script setup lang="ts">
import { ArrowUpDown, NotebookPen, Plus, RefreshCw, SearchX, TriangleAlert } from 'lucide-vue-next'
import type { EntryFilterInput, EntryType } from '@garage/shared/schemas/entry'
import { todayIso } from '@garage/shared/utils/format'
import { groupEntriesByMonth } from '@garage/shared/utils/groupEntries'
import { describeJournalSummary } from '~/utils/journalSummary'

// Журнал (В1–В7, Т2): записи по месяцам, чипы типов, поиск, порядок «по дате / по пробегу»
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300
/** Пауза после последнего символа поиска перед запросом, мс */
const SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { entries: loadedEntries, fetchEntries } = useEntries(carId)
const { savedCount, open: openEntrySheet } = useEntrySheet()
const { open: openEntryDetail, hiddenIds, changedCount } = useEntryDetailSheet()
/** Запись, удаляемая с «Отменить», пропадает из списка сразу, до запроса на сервер */
const entries = computed(() =>
  loadedEntries.value.filter((entry) => !hiddenIds.value.includes(entry.id)),
)

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
/** Были ли фильтры у запроса, чей ответ сейчас в `entries`: пустой список относится к нему, а не к текущим чипам */
const loadedWithFilters = ref(false)
/** Поисковый запрос того же ответа — для заголовка «Ничего не нашли по «…»» */
const loadedSearch = ref('')
const loaded = computed(() => loadedCarId.value === carId.value && !failed.value)
const journalEmpty = computed(
  () => loaded.value && !entries.value.length && !loadedWithFilters.value,
)
const nothingFound = computed(
  () => loaded.value && !entries.value.length && loadedWithFilters.value,
)
/** При сортировке по пробегу месяцев нет — один плоский список */
const groups = computed(() => (sortBy.value === 'date' ? groupEntriesByMonth(entries.value) : []))
const summary = computed(() => describeJournalSummary(entries.value, loadedWithFilters.value))
const sortLabel = computed(
  () => `Сортировка: ${sortBy.value === 'date' ? 'по дате' : 'по пробегу'}`,
)
const notFoundTitle = computed(() =>
  loadedSearch.value ? `Ничего не нашли по «${loadedSearch.value}»` : 'Ничего не нашли',
)

function toggleSort() {
  sortBy.value = sortBy.value === 'date' ? 'mileage' : 'date'
}

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
  const requestHasFilters = hasFilters.value
  const requestSearch = query.value.search ?? ''
  try {
    await fetchEntries(query.value)
    if (token === loadToken) {
      loadedCarId.value = carId.value
      loadedWithFilters.value = requestHasFilters
      loadedSearch.value = requestSearch
    }
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

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (search.value = value), SEARCH_DEBOUNCE_MS)
})
watch([carId, query], () => Number.isInteger(carId.value) && load(), { immediate: true })
// Запись добавлена или изменена в шторке — перечитываем список с теми же фильтрами
watch([savedCount, changedCount], load)
onBeforeUnmount(() => {
  clearTimeout(skeletonTimer)
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="flex flex-1 flex-col gap-sp-4 pt-sp-2" :aria-busy="loading">
    <div class="flex items-center justify-between gap-sp-3">
      <h1 class="text-h1 text-text">Журнал</h1>
      <UiIconButton
        v-if="!journalEmpty && !failed"
        :icon="ArrowUpDown"
        :label="sortLabel"
        variant="filled"
        :aria-pressed="sortBy === 'mileage'"
        data-testid="journal-sort"
        @click="toggleSort"
      />
    </div>

    <JournalFilters
      v-if="!journalEmpty && !failed"
      v-model:type="type"
      v-model:search="searchInput"
    />

    <section v-if="failed" class="flex flex-1 items-center justify-center">
      <UiEmptyState
        :icon="TriangleAlert"
        tone="danger"
        title="Не удалось загрузить журнал"
        message="Сервер не ответил. Ваши записи в безопасности — попробуйте ещё раз через минуту."
      >
        <template #action>
          <UiButton :icon="RefreshCw" @click="load">Повторить</UiButton>
        </template>
      </UiEmptyState>
    </section>

    <section v-else-if="journalEmpty" class="flex flex-1 items-center justify-center">
      <UiEmptyState
        :icon="NotebookPen"
        title="Записей пока нет"
        message="Записывайте ТО, ремонты и покупки — здесь появится история машины с итогами по месяцам. Поиск и фильтры появятся, когда будет что искать."
      >
        <template #action>
          <UiButton :icon="Plus" @click="openEntrySheet({ carId })">Добавить запись</UiButton>
        </template>
      </UiEmptyState>
    </section>

    <section v-else-if="nothingFound" class="flex flex-1 flex-col items-center gap-sp-4">
      <div class="flex flex-1 items-center">
        <UiEmptyState
          :icon="SearchX"
          :title="notFoundTitle"
          message="Ищем по описанию, месту и категории. Попробуйте другое слово или сбросьте фильтр."
        />
      </div>
      <UiButton variant="secondary" @click="resetFilters">
        {{ loadedSearch ? 'Сбросить поиск' : 'Сбросить фильтр' }}
      </UiButton>
    </section>

    <template v-else-if="loaded">
      <p class="px-sp-1 text-sm text-text-2" data-testid="journal-summary">{{ summary }}</p>
      <JournalMonthGroup
        v-for="group in groups"
        :key="group.month"
        :group="group"
        :today="today"
        @open="openEntryDetail"
      />
      <UiCard v-if="sortBy === 'mileage'" tag="ul">
        <li v-for="entry in entries" :key="entry.id">
          <UiRowEntry :entry="entry" :today="today" @open="openEntryDetail(entry)" />
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
