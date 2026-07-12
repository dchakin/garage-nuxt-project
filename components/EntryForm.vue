<script setup lang="ts">
import type { Entry } from '~~/shared/types'
import type { EntryInput } from '~~/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '~~/shared/schemas/entry'

const props = defineProps<{ initial?: Entry | null }>()
const emit = defineEmits<{ submit: [EntryInput]; cancel: [] }>()

const { categories, fetchCategories } = useCategories()
await fetchCategories()

const today = new Date().toISOString().slice(0, 10)

const form = reactive<EntryInput>({
  date: props.initial?.date ?? today,
  type: props.initial?.type ?? 'maintenance',
  categoryId: props.initial?.categoryId ?? null,
  description: props.initial?.description ?? '',
  mileage: props.initial?.mileage ?? null,
  cost: props.initial?.cost ?? null,
  currency: props.initial?.currency ?? 'RUB',
  place: props.initial?.place ?? ''
})

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="onSubmit">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Дата</label>
        <input v-model="form.date" type="date" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Тип</label>
        <select v-model="form.type" class="w-full rounded-lg border border-slate-300 px-3 py-2">
          <option v-for="t in entryTypes" :key="t" :value="t">{{ entryTypeLabels[t] }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-sm text-slate-600 mb-1">Категория</label>
      <select v-model.number="form.categoryId" class="w-full rounded-lg border border-slate-300 px-3 py-2">
        <option :value="null">Без категории</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div>
      <label class="block text-sm text-slate-600 mb-1">Описание</label>
      <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2"></textarea>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Пробег, км</label>
        <input v-model.number="form.mileage" type="number" min="0" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Стоимость</label>
        <input v-model.number="form.cost" type="number" min="0" step="0.01" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>

    <div>
      <label class="block text-sm text-slate-600 mb-1">Место (сервис/магазин)</label>
      <input v-model="form.place" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
    </div>

    <div class="flex gap-3 pt-2">
      <button type="submit" class="flex-1 rounded-lg bg-slate-800 text-white py-2 font-medium hover:bg-slate-700">
        Сохранить
      </button>
      <button type="button" class="flex-1 rounded-lg border border-slate-300 py-2 font-medium" @click="emit('cancel')">
        Отмена
      </button>
    </div>
  </form>
</template>
