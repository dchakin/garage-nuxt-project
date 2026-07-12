import type { Entry } from '~~/shared/types'
import type { EntryInput, EntryFilterInput } from '~~/shared/schemas/entry'

export function useEntries(carId: MaybeRefOrGetter<number>) {
  const entries = ref<Entry[]>([])
  const loading = ref(false)

  async function fetchEntries(filters: Partial<EntryFilterInput> = {}) {
    loading.value = true
    try {
      entries.value = await $fetch<Entry[]>(`/api/cars/${toValue(carId)}/entries`, { query: filters })
    } finally {
      loading.value = false
    }
  }

  async function createEntry(input: EntryInput) {
    const entry = await $fetch<Entry>(`/api/cars/${toValue(carId)}/entries`, { method: 'POST', body: input })
    entries.value = [entry, ...entries.value]
    return entry
  }

  async function updateEntry(id: number, input: Partial<EntryInput>) {
    const updated = await $fetch<Entry>(`/api/entries/${id}`, { method: 'PATCH', body: input })
    entries.value = entries.value.map((e) => (e.id === id ? updated : e))
    return updated
  }

  async function deleteEntry(id: number) {
    await $fetch(`/api/entries/${id}`, { method: 'DELETE' })
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  return { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry }
}
