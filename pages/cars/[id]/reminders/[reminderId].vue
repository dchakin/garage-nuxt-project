<script setup lang="ts">
import type { Reminder } from '~~/shared/types'
import type { ReminderInput } from '~~/shared/schemas/reminder'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const reminderId = Number(route.params.reminderId)
const { updateReminder, saving } = useReminders(carId)

const requestFetch = useRequestFetch()
const reminder = await requestFetch<Reminder>(`/api/reminders/${reminderId}`)

const error = ref('')

async function onSubmit(input: ReminderInput) {
  error.value = ''
  try {
    await updateReminder(reminderId, input)
    await navigateTo(`/cars/${carId}?tab=reminders`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить напоминание'
  }
}
</script>

<template>
  <div>
    <NuxtLink :to="`/cars/${carId}?tab=reminders`" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← К автомобилю</NuxtLink>

    <h1 class="text-lg font-semibold text-slate-800 mt-2 mb-4">Редактирование напоминания</h1>

    <div class="card p-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <ReminderForm :car-id="carId" :initial="reminder" :saving="saving" @submit="onSubmit" @cancel="navigateTo(`/cars/${carId}?tab=reminders`)" />
    </div>
  </div>
</template>
