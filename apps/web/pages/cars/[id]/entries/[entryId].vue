<script setup lang="ts">
import type { Entry } from '@garage/shared/types'
import type { EntryInput } from '@garage/shared/schemas/entry'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const entryId = Number(route.params.entryId)
const { updateEntry, saving } = useEntries(carId)

const entry = await $fetch<Entry>(`/api/entries/${entryId}`)

const error = ref('')

async function onSubmit(input: EntryInput) {
  error.value = ''
  try {
    await updateEntry(entryId, input)
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
      <EntryForm
        :initial="entry"
        :saving="saving"
        @submit="onSubmit"
        @cancel="navigateTo(`/cars/${carId}/journal`)"
      />
    </div>
  </div>
</template>
