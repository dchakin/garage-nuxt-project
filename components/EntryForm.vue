<script setup lang="ts">
import type { Entry } from '~~/shared/types'
import type { EntryInput } from '~~/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '~~/shared/schemas/entry'

const props = defineProps<{ initial?: Entry | null; saving?: boolean }>()
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
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Дата</label>
        <input v-model="form.date" type="date" required class="input" />
      </div>
      <div>
        <label class="label">Тип</label>
        <select v-model="form.type" class="select">
          <option v-for="t in entryTypes" :key="t" :value="t">{{ entryTypeLabels[t] }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="label">Категория</label>
      <select v-model.number="form.categoryId" class="select">
        <option :value="null">Без категории</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div>
      <label class="label">Описание</label>
      <textarea v-model="form.description" rows="2" class="textarea"></textarea>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Пробег, км</label>
        <input v-model.number="form.mileage" type="number" min="0" class="input" />
      </div>
      <div>
        <label class="label">Стоимость</label>
        <input v-model.number="form.cost" type="number" min="0" step="0.01" class="input" />
      </div>
    </div>

    <div>
      <label class="label">Место (сервис/магазин)</label>
      <input v-model="form.place" class="input" />
    </div>

    <div class="flex gap-3 pt-2">
      <button type="submit" :disabled="saving" class="btn-primary flex-1 py-2">
        <Spinner v-if="saving" />
        {{ saving ? 'Сохранение...' : 'Сохранить' }}
      </button>
      <button type="button" :disabled="saving" class="btn-secondary flex-1 py-2" @click="emit('cancel')">
        Отмена
      </button>
    </div>
  </form>
</template>
