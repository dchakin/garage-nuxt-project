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
      const url = `/api/cars/${toValue(carId)}/analytics`
      if (query) {
        analytics.value = await $fetch<CarAnalytics>(url, { query })
        return
      }
      const month = todayIso().slice(0, 7)
      // «в среднем N в месяц» на Обзоре — за год (в месячной выборке это был бы сам месяц)
      const [monthStats, yearStats] = await Promise.all([
        $fetch<CarAnalytics>(url, { query: { period: 'month', date: month } }),
        $fetch<CarAnalytics>(url, { query: { period: 'year', date: month.slice(0, 4) } }),
      ])
      analytics.value = { ...monthStats, avgPerMonth: yearStats.avgPerMonth }
    } finally {
      loading.value = false
    }
  }

  return { analytics, loading, fetchAnalytics }
}
