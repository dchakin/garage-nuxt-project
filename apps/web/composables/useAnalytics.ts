import type { CarAnalytics } from '@garage/shared/types'
import type { AnalyticsQuery } from '@garage/shared/schemas/analytics'
import { todayIso } from '@garage/shared/utils/format'

export function useAnalytics(carId: MaybeRefOrGetter<number>) {
  const analytics = ref<CarAnalytics | null>(null)
  const loading = ref(false)

  /**
   * По умолчанию — текущий месяц. `date` берётся с часов клиента, чтобы месяц в запросе
   * совпадал с подписью «Расходы в октябре» (сервер при границе месяца может быть в другом).
   */
  async function fetchAnalytics(query?: Partial<AnalyticsQuery>) {
    loading.value = true
    try {
      query ??= { period: 'month', date: todayIso().slice(0, 7) }
      analytics.value = await $fetch<CarAnalytics>(`/api/cars/${toValue(carId)}/analytics`, {
        query,
      })
    } finally {
      loading.value = false
    }
  }

  return { analytics, loading, fetchAnalytics }
}
