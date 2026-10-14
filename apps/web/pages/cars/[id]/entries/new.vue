<script setup lang="ts">
import type { EntryInput } from '@garage/shared/schemas/entry'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { createEntry, saving } = useEntries(carId)

const error = ref('')

async function onSubmit(input: EntryInput) {
  error.value = ''
  try {
    await createEntry(input)
    await navigateTo(`/cars/${carId}/journal`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить запись'
  }
}
</script>

<template>
  <div>
    <BackLink :to="`/cars/${carId}/journal`">Назад</BackLink>

    <h1 class="text-h1 text-text mt-2 mb-4">Новая запись</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <EntryForm
        :saving="saving"
        @submit="onSubmit"
        @cancel="navigateTo(`/cars/${carId}/journal`)"
      />
    </div>
  </div>
</template>
