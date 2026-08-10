<script setup lang="ts">
import type { Entry } from '~~/shared/types'
import type { EntryInput } from '~~/shared/schemas/entry'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const entryId = Number(route.params.entryId)
const { updateEntry, saving } = useEntries(carId)

const requestFetch = useRequestFetch()
const entry = await requestFetch<Entry>(`/api/entries/${entryId}`)

const error = ref('')

async function onSubmit(input: EntryInput) {
  error.value = ''
  try {
    await updateEntry(entryId, input)
    await navigateTo(`/cars/${carId}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить запись'
  }
}
</script>

<template>
  <div>
    <NuxtLink :to="`/cars/${carId}`" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← К автомобилю</NuxtLink>

    <h1 class="text-lg font-semibold text-slate-800 mt-2 mb-4">Редактирование записи</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <EntryForm :initial="entry" :saving="saving" @submit="onSubmit" @cancel="navigateTo(`/cars/${carId}`)" />
    </div>
  </div>
</template>
