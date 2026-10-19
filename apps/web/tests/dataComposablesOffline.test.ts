import { ref, toValue } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CarAnalytics, Entry, Reminder } from '@garage/shared/types'

// Composables написаны под авто-импорты Nuxt — в тесте подставляем их глобально
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('toValue', toValue)
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const NETWORK_ERROR = new TypeError('Failed to fetch')

describe('composables данных при сетевой ошибке', () => {
  it('useReminders оставляет последние загруженные напоминания', async () => {
    const { useReminders } = await import('~/composables/useReminders')
    const { reminders, loading, fetchReminders } = useReminders(1)
    const loaded = [{ id: 5, title: 'Замена масла' }] as Reminder[]

    fetchMock.mockResolvedValueOnce(loaded)
    await fetchReminders()
    fetchMock.mockRejectedValueOnce(NETWORK_ERROR)
    await expect(fetchReminders()).rejects.toThrow(NETWORK_ERROR)

    expect(reminders.value).toEqual(loaded)
    expect(loading.value).toBe(false)
  })

  it('useEntries оставляет последние загруженные записи', async () => {
    const { useEntries } = await import('~/composables/useEntries')
    const { entries, loading, fetchEntries } = useEntries(1)
    const loaded = [{ id: 9, description: 'Щётки' }] as Entry[]

    fetchMock.mockResolvedValueOnce(loaded)
    await fetchEntries()
    fetchMock.mockRejectedValueOnce(NETWORK_ERROR)
    await expect(fetchEntries()).rejects.toThrow(NETWORK_ERROR)

    expect(entries.value).toEqual(loaded)
    expect(loading.value).toBe(false)
  })

  it('useAnalytics оставляет последнюю загруженную аналитику', async () => {
    const { useAnalytics } = await import('~/composables/useAnalytics')
    const { analytics, loading, fetchAnalytics } = useAnalytics(1)
    const loaded = { total: 1200, avgPerMonth: 9800 } as CarAnalytics

    fetchMock.mockResolvedValue(loaded)
    await fetchAnalytics()
    fetchMock.mockRejectedValue(NETWORK_ERROR)
    await expect(fetchAnalytics()).rejects.toThrow(NETWORK_ERROR)

    expect(analytics.value).toEqual(loaded)
    expect(loading.value).toBe(false)
  })
})
