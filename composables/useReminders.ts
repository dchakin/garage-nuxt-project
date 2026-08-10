import type { Reminder } from '~~/shared/types'
import type { ReminderInput, ReminderFilterInput } from '~~/shared/schemas/reminder'

export function useReminders(carId: MaybeRefOrGetter<number>) {
  const reminders = ref<Reminder[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref<number | null>(null)
  // useRequestFetch пробрасывает cookie при SSR (обычный $fetch — нет, что давало 401)
  const requestFetch = useRequestFetch()

  async function fetchReminders(filters: Partial<ReminderFilterInput> = {}) {
    loading.value = true
    try {
      reminders.value = await requestFetch<Reminder[]>(`/api/cars/${toValue(carId)}/reminders`, { query: filters })
    } finally {
      loading.value = false
    }
  }

  async function createReminder(input: ReminderInput) {
    saving.value = true
    try {
      const reminder = await $fetch<Reminder>(`/api/cars/${toValue(carId)}/reminders`, { method: 'POST', body: input })
      reminders.value = [reminder, ...reminders.value]
      return reminder
    } finally {
      saving.value = false
    }
  }

  async function updateReminder(id: number, input: Partial<ReminderInput>) {
    saving.value = true
    try {
      const updated = await $fetch<Reminder>(`/api/reminders/${id}`, { method: 'PATCH', body: input })
      reminders.value = reminders.value.map((r) => (r.id === id ? updated : r))
      return updated
    } finally {
      saving.value = false
    }
  }

  async function deleteReminder(id: number) {
    deletingId.value = id
    try {
      await $fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      reminders.value = reminders.value.filter((r) => r.id !== id)
    } finally {
      deletingId.value = null
    }
  }

  return { reminders, loading, saving, deletingId, fetchReminders, createReminder, updateReminder, deleteReminder }
}
