import type { Reminder } from '@garage/shared/types'
import type {
  ReminderInput,
  ReminderFilterInput,
  ReminderBulkInput,
} from '@garage/shared/schemas/reminder'

export function useReminders(carId: MaybeRefOrGetter<number>) {
  const reminders = ref<Reminder[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref<number | null>(null)

  async function fetchReminders(filters: Partial<ReminderFilterInput> = {}) {
    loading.value = true
    try {
      reminders.value = await $fetch<Reminder[]>(`/api/cars/${toValue(carId)}/reminders`, {
        query: filters,
      })
    } finally {
      loading.value = false
    }
  }

  async function createReminder(input: ReminderInput) {
    saving.value = true
    try {
      const reminder = await $fetch<Reminder>(`/api/cars/${toValue(carId)}/reminders`, {
        method: 'POST',
        body: input,
      })
      reminders.value = [reminder, ...reminders.value]
      return reminder
    } finally {
      saving.value = false
    }
  }

  /** Создание с расчётом срока на сервере от «последнего раза» (`POST …/reminders/bulk`) */
  async function createRemindersFromLast(items: ReminderBulkInput['reminders']) {
    saving.value = true
    try {
      const created = await $fetch<Reminder[]>(`/api/cars/${toValue(carId)}/reminders/bulk`, {
        method: 'POST',
        body: { reminders: items },
      })
      reminders.value = [...created, ...reminders.value]
      return created
    } finally {
      saving.value = false
    }
  }

  async function updateReminder(id: number, input: Partial<ReminderInput>) {
    saving.value = true
    try {
      const updated = await $fetch<Reminder>(`/api/reminders/${id}`, {
        method: 'PATCH',
        body: input,
      })
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

  return {
    reminders,
    loading,
    saving,
    deletingId,
    fetchReminders,
    createReminder,
    createRemindersFromLast,
    updateReminder,
    deleteReminder,
  }
}
