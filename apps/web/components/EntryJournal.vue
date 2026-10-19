<script setup lang="ts">
import type { EntryFilterInput } from '@garage/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '@garage/shared/schemas/entry'
import { ChevronDown, NotebookPen, Plus, Search, SlidersHorizontal, X } from 'lucide-vue-next'

const props = defineProps<{ carId: number }>()

const { entries, loading, fetchEntries } = useEntries(props.carId)
const { categories, fetchCategories } = useCategories()

const filters = reactive<Partial<EntryFilterInput>>({ sortBy: 'date', sortDir: 'desc' })
const searchInput = ref('')

const showFilters = ref(false)

const activeFilterCount = computed(
  () =>
    [filters.type, filters.categoryId, filters.dateFrom, filters.dateTo].filter(
      (v) => v != null && v !== '',
    ).length,
)

function clearFilters() {
  filters.type = undefined
  filters.categoryId = undefined
  filters.dateFrom = undefined
  filters.dateTo = undefined
}

function clearSearch() {
  searchInput.value = ''
}

await Promise.all([fetchEntries(filters), fetchCategories()])

watch(filters, () => fetchEntries(filters), { deep: true })

// Запись добавлена из шторки — перечитать список с текущими фильтрами
const { open: openEntrySheet, savedCount } = useEntrySheet()
watch(savedCount, () => fetchEntries(filters))

// Запись изменена или удалена в шторке Д4; удаляемая запись пропадает из списка сразу
const { open: openEntryDetail, hiddenIds, changedCount } = useEntryDetailSheet()
watch(changedCount, () => fetchEntries(filters))
const visibleEntries = computed(() =>
  entries.value.filter((entry) => !hiddenIds.value.includes(entry.id)),
)

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.search = value.trim() || undefined
  }, 300)
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
      <h2 class="text-h2 text-text">Журнал</h2>
      <UiButton size="sm" :icon="Plus" @click="openEntrySheet({ carId })">
        Добавить запись
      </UiButton>
    </div>

    <div class="mb-4">
      <div class="relative mb-2">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3"
          aria-hidden="true"
        />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Поиск по описанию, месту..."
          class="input w-full pl-9 pr-8 text-sm"
        />
        <button
          v-if="searchInput"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors"
          aria-label="Очистить поиск"
          @click="clearSearch"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-1 text-sm">
        <button
          class="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-text-2 hover:text-text hover:border-border-strong transition-colors"
          :class="{ 'border-border-strong text-text': showFilters || activeFilterCount }"
          @click="showFilters = !showFilters"
        >
          <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />
          Фильтры
          <span
            v-if="activeFilterCount"
            class="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-inverse px-1 text-xs font-medium text-on-inverse"
            >{{ activeFilterCount }}</span
          >
          <ChevronDown
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-180': showFilters }"
            aria-hidden="true"
          />
        </button>

        <button
          v-if="activeFilterCount"
          class="flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-soft hover:text-danger-text transition-colors"
          title="Сбросить фильтры"
          aria-label="Сбросить фильтры"
          @click="clearFilters"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>

        <select v-model="filters.sortBy" class="select w-auto ml-auto">
          <option value="date">По дате</option>
          <option value="mileage">По пробегу</option>
        </select>
      </div>

      <div v-if="showFilters" class="card p-3 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-text-2">Тип</span>
          <select v-model="filters.type" class="select w-full">
            <option :value="undefined">Все типы</option>
            <option v-for="t in entryTypes" :key="t" :value="t">{{ entryTypeLabels[t] }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-text-2">Категория</span>
          <select v-model.number="filters.categoryId" class="select w-full">
            <option :value="undefined">Все категории</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-text-2">Дата с</span>
          <input v-model="filters.dateFrom" type="date" class="input w-full" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-text-2">Дата по</span>
          <input v-model="filters.dateTo" type="date" class="input w-full" />
        </label>
      </div>
    </div>

    <div
      v-if="loading && !entries.length"
      class="flex items-center justify-center py-8 text-text-2"
    >
      <UiSpinner size="md" />
    </div>
    <div v-else-if="!visibleEntries.length" class="card p-8 text-center">
      <NotebookPen class="mx-auto mb-2 h-7 w-7 text-text-3" aria-hidden="true" />
      <p class="text-text-2 text-sm">Записей пока нет.</p>
    </div>

    <UiCard v-else tag="ul">
      <li v-for="entry in visibleEntries" :key="entry.id">
        <UiRowEntry :entry="entry" @open="openEntryDetail(entry)" />
      </li>
    </UiCard>
  </div>
</template>
