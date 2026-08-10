<script setup lang="ts">
import type { Entry } from '~~/shared/types'
import type { EntryFilterInput } from '~~/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '~~/shared/schemas/entry'

const props = defineProps<{ carId: number }>()

const { entries, loading, deletingId, fetchEntries, deleteEntry } = useEntries(props.carId)
const { categories, fetchCategories } = useCategories()
const { confirm } = useConfirmDialog()

const filters = reactive<Partial<EntryFilterInput>>({ sortBy: 'date', sortDir: 'desc' })
const searchInput = ref('')

const showFilters = ref(false)

const activeFilterCount = computed(() =>
  [filters.type, filters.categoryId, filters.dateFrom, filters.dateTo].filter(v => v != null && v !== '').length
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

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.search = value.trim() || undefined
  }, 300)
})

async function onDelete(entry: Entry) {
  const ok = await confirm({
    title: 'Удалить запись?',
    message: `«${entryTypeLabels[entry.type]}» от ${entry.date} будет удалена безвозвратно.`,
    confirmText: 'Удалить',
    danger: true
  })
  if (!ok) return
  await deleteEntry(entry.id)
}

function formatCost(entry: Entry) {
  if (entry.cost == null) return ''
  return `${entry.cost.toLocaleString('ru-RU')} ${entry.currency}`
}

const entryTypeIcons: Record<string, string> = {
  repair: '🔧',
  replacement: '🔩',
  purchase: '🛒',
  maintenance: '🛠️',
  other: '📋'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-800">Журнал</h2>
      <NuxtLink :to="`/cars/${carId}/entries/new`" class="btn-primary px-3 py-1.5 text-sm">
        + Добавить запись
      </NuxtLink>
    </div>

    <div class="mb-4">
      <div class="relative mb-2">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="9" r="6" />
          <path d="M17 17l-3.5-3.5" />
        </svg>
        <input
          v-model="searchInput"
          type="text"
          placeholder="Поиск по описанию, месту..."
          class="input w-full pl-9 pr-8 text-sm"
        />
        <button
          v-if="searchInput"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          @click="clearSearch"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-1 text-sm">
        <button
          class="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-colors"
          :class="{ 'border-slate-400 text-slate-800': showFilters || activeFilterCount }"
          @click="showFilters = !showFilters"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M3 5h14M6 10h8M9 15h2" />
          </svg>
          Фильтры
          <span
            v-if="activeFilterCount"
            class="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-800 px-1 text-xs font-medium text-white"
          >{{ activeFilterCount }}</span>
          <svg class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': showFilters }" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>

        <button
          v-if="activeFilterCount"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          title="Сбросить фильтры"
          aria-label="Сбросить фильтры"
          @click="clearFilters"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        <select v-model="filters.sortBy" class="select w-auto ml-auto">
          <option value="date">По дате</option>
          <option value="mileage">По пробегу</option>
        </select>
      </div>

      <div v-if="showFilters" class="card p-3 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Тип</span>
          <select v-model="filters.type" class="select w-full">
            <option :value="undefined">Все типы</option>
            <option v-for="t in entryTypes" :key="t" :value="t">{{ entryTypeLabels[t] }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Категория</span>
          <select v-model.number="filters.categoryId" class="select w-full">
            <option :value="undefined">Все категории</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Дата с</span>
          <input v-model="filters.dateFrom" type="date" class="input w-full" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Дата по</span>
          <input v-model="filters.dateTo" type="date" class="input w-full" />
        </label>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-slate-500">
      <Spinner size="md" />
    </div>
    <div v-else-if="!entries.length" class="card p-8 text-center">
      <div class="text-3xl mb-2">📋</div>
      <p class="text-slate-500 text-sm">Записей пока нет.</p>
    </div>

    <div v-else class="space-y-2">
      <div v-for="entry in entries" :key="entry.id" class="card p-4">
        <div class="flex items-start gap-2.5">
          <span class="text-base leading-none shrink-0 self-start mt-0.5">{{ entryTypeIcons[entry.type] }}</span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
              <p class="font-medium text-slate-800 leading-snug flex-1 min-w-[140px]">
                {{ entryTypeLabels[entry.type] }}
              </p>
              <div class="flex items-center gap-1 shrink-0 ml-auto">
                <NuxtLink
                  :to="`/cars/${carId}/entries/${entry.id}`"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                  :class="{ 'pointer-events-none opacity-50': deletingId === entry.id }"
                  title="Изменить"
                  aria-label="Изменить"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13.5 3.5a1.5 1.5 0 0 1 2 2l-9 9-3 1 1-3 9-9Z" />
                  </svg>
                </NuxtLink>
                <button
                  :disabled="deletingId === entry.id"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors"
                  title="Удалить"
                  aria-label="Удалить"
                  @click="onDelete(entry)"
                >
                  <Spinner v-if="deletingId === entry.id" />
                  <svg v-else class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.4a1.5 1.5 0 0 1-1.5 1.4H8.1a1.5 1.5 0 0 1-1.5-1.4L6 6" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-if="entry.category" class="text-sm text-slate-400 mt-0.5">{{ entry.category.name }}</p>
            <p class="text-sm text-slate-500 mt-0.5">
              {{ entry.date }} <span v-if="entry.mileage != null">· {{ entry.mileage.toLocaleString('ru-RU') }} км</span>
            </p>
            <p v-if="entry.description" class="text-sm text-slate-700 mt-2">{{ entry.description }}</p>
            <p v-if="entry.place" class="text-sm text-slate-400 mt-1">{{ entry.place }}</p>
            <p v-if="entry.cost != null" class="font-medium text-slate-800 text-sm text-right mt-2">{{ formatCost(entry) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
