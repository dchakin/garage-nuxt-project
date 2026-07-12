<script setup lang="ts">
import type { Entry } from '~~/shared/types'
import type { EntryInput, EntryFilterInput } from '~~/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '~~/shared/schemas/entry'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)

const { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry } = useEntries(carId)
const { categories, fetchCategories } = useCategories()

const filters = reactive<Partial<EntryFilterInput>>({ sortBy: 'date', sortDir: 'desc' })

await Promise.all([fetchEntries(filters), fetchCategories()])

const showForm = ref(false)
const editingEntry = ref<Entry | null>(null)
const error = ref('')

watch(filters, () => fetchEntries(filters), { deep: true })

function openCreate() {
  editingEntry.value = null
  showForm.value = true
}

function openEdit(entry: Entry) {
  editingEntry.value = entry
  showForm.value = true
}

async function onSubmit(input: EntryInput) {
  error.value = ''
  try {
    if (editingEntry.value) {
      await updateEntry(editingEntry.value.id, input)
    } else {
      await createEntry(input)
    }
    showForm.value = false
    editingEntry.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить запись'
  }
}

async function onDelete(entry: Entry) {
  if (!confirm('Удалить запись?')) return
  await deleteEntry(entry.id)
}

function formatCost(entry: Entry) {
  if (entry.cost == null) return ''
  return `${entry.cost.toLocaleString('ru-RU')} ${entry.currency}`
}
</script>

<template>
  <div>
    <NuxtLink :to="`/cars/${carId}`" class="text-sm text-slate-500 hover:underline">← К автомобилю</NuxtLink>

    <div class="flex items-center justify-between mt-2 mb-4">
      <h1 class="text-lg font-semibold text-slate-800">Журнал</h1>
      <button class="text-sm rounded-lg bg-slate-800 text-white px-3 py-1.5" @click="openCreate">
        + Добавить запись
      </button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4 text-sm">
      <select v-model="filters.type" class="rounded-lg border border-slate-300 px-2 py-1">
        <option :value="undefined">Все типы</option>
        <option v-for="t in entryTypes" :key="t" :value="t">{{ entryTypeLabels[t] }}</option>
      </select>
      <select v-model.number="filters.categoryId" class="rounded-lg border border-slate-300 px-2 py-1">
        <option :value="undefined">Все категории</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <input v-model="filters.dateFrom" type="date" class="rounded-lg border border-slate-300 px-2 py-1" />
      <input v-model="filters.dateTo" type="date" class="rounded-lg border border-slate-300 px-2 py-1" />
      <select v-model="filters.sortBy" class="rounded-lg border border-slate-300 px-2 py-1">
        <option value="date">По дате</option>
        <option value="mileage">По пробегу</option>
      </select>
    </div>

    <div v-if="showForm" class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <p v-if="error" class="text-sm text-red-600 mb-2">{{ error }}</p>
      <EntryForm :initial="editingEntry" @submit="onSubmit" @cancel="showForm = false" />
    </div>

    <p v-if="loading" class="text-slate-500 text-sm">Загрузка...</p>
    <p v-else-if="!entries.length" class="text-slate-500 text-sm">Записей пока нет.</p>

    <div v-else class="space-y-2">
      <div v-for="entry in entries" :key="entry.id" class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-slate-800">
              {{ entryTypeLabels[entry.type] }}
              <span v-if="entry.category" class="text-slate-400">· {{ entry.category.name }}</span>
            </p>
            <p class="text-sm text-slate-500">{{ entry.date }} <span v-if="entry.mileage != null">· {{ entry.mileage.toLocaleString('ru-RU') }} км</span></p>
            <p v-if="entry.description" class="text-sm text-slate-700 mt-1">{{ entry.description }}</p>
            <p v-if="entry.place" class="text-sm text-slate-400 mt-1">{{ entry.place }}</p>
          </div>
          <div class="text-right shrink-0 ml-3">
            <p v-if="entry.cost != null" class="font-medium text-slate-800">{{ formatCost(entry) }}</p>
            <div class="flex gap-2 mt-2 text-xs">
              <button class="text-slate-500 hover:underline" @click="openEdit(entry)">Изменить</button>
              <button class="text-red-600 hover:underline" @click="onDelete(entry)">Удалить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
