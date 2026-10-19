<script setup lang="ts">
// Временная страница правки: заменяется шторкой Д4 (#59), поэтому форма пока живёт здесь
import type { Entry } from '@garage/shared/types'
import type { EntryInput } from '@garage/shared/schemas/entry'
import { entryTypes, entryTypeLabels } from '@garage/shared/schemas/entry'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const entryId = Number(route.params.entryId)
const { updateEntry, saving } = useEntries(carId)
const { categories, fetchCategories } = useCategories()

const [entry] = await Promise.all([$fetch<Entry>(`/api/entries/${entryId}`), fetchCategories()])

const form = reactive<EntryInput>({
  date: entry.date,
  type: entry.type,
  categoryId: entry.categoryId ?? null,
  description: entry.description ?? '',
  mileage: entry.mileage ?? null,
  cost: entry.cost ?? null,
  currency: entry.currency ?? 'RUB',
  place: entry.place ?? '',
})

const error = ref('')

async function onSubmit() {
  error.value = ''
  try {
    await updateEntry(entryId, { ...form })
    await navigateTo(`/cars/${carId}/journal`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить запись'
  }
}
</script>

<template>
  <div>
    <BackLink :to="`/cars/${carId}/journal`">Назад</BackLink>

    <h1 class="text-h1 text-text mt-2 mb-4">Редактирование записи</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
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
          <UiButton type="submit" :loading="saving" class="flex-1">
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </UiButton>
          <UiButton
            variant="secondary"
            :disabled="saving"
            class="flex-1"
            @click="navigateTo(`/cars/${carId}/journal`)"
          >
            Отмена
          </UiButton>
        </div>
      </form>
    </div>
  </div>
</template>
