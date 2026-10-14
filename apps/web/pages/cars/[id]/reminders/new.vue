<script setup lang="ts">
import type { ReminderInput } from '@garage/shared/schemas/reminder'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { createReminder, saving } = useReminders(carId)

const error = ref('')

async function onSubmit(input: ReminderInput) {
  error.value = ''
  try {
    await createReminder(input)
    await navigateTo(`/cars/${carId}/reminders`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить напоминание'
  }
}
</script>

<template>
  <div>
    <BackLink :to="`/cars/${carId}/reminders`">Назад</BackLink>

    <h1 class="text-h1 text-text mt-2 mb-4">Новое напоминание</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <ReminderForm
        :car-id="carId"
        :saving="saving"
        @submit="onSubmit"
        @cancel="navigateTo(`/cars/${carId}/reminders`)"
      />
    </div>
  </div>
</template>
