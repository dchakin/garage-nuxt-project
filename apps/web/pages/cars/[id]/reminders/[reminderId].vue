<script setup lang="ts">
import type { Reminder } from '@garage/shared/types'
import type { ReminderInput } from '@garage/shared/schemas/reminder'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const reminderId = Number(route.params.reminderId)
const { updateReminder, saving } = useReminders(carId)

const reminder = await $fetch<Reminder>(`/api/reminders/${reminderId}`)

const error = ref('')

async function onSubmit(input: ReminderInput) {
  error.value = ''
  try {
    await updateReminder(reminderId, input)
    await navigateTo(`/cars/${carId}/reminders`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить напоминание'
  }
}
</script>

<template>
  <div>
    <BackLink :to="`/cars/${carId}/reminders`">Назад</BackLink>

    <h1 class="text-h1 text-text mt-2 mb-4">Редактирование напоминания</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <ReminderForm
        :car-id="carId"
        :initial="reminder"
        :saving="saving"
        @submit="onSubmit"
        @cancel="navigateTo(`/cars/${carId}/reminders`)"
      />
    </div>
  </div>
</template>
