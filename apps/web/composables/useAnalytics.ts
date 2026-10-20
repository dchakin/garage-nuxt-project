import type { CarAnalytics } from '@garage/shared/types'
import type { AnalyticsPeriod, AnalyticsQuery } from '@garage/shared/schemas/analytics'
import { todayIso } from '@garage/shared/utils/format'
import type { ExpensesQuery } from '~/utils/expensesPeriod'

/** Аналитика выбранного периода экрана «Расходы» и суммы ближайших периодов с тратами (Ж3) */
export interface PeriodReport {
  query: ExpensesQuery
  analytics: CarAnalytics
  neighbourTotals: { prev: number | null; next: number | null }
}

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

  /** Сумма трат за период; ближайшие периоды в Ж3 («7 500 ₽ в июне и 9 900 ₽ в августе») */
  async function fetchPeriodTotal(period: AnalyticsPeriod, date: string): Promise<number> {
    const result = await $fetch<CarAnalytics>(`/api/cars/${toValue(carId)}/analytics`, {
      query: { period, date },
    })
    return result.total
  }

  /**
   * Экран «Расходы»: аналитика выбранного периода без записи в общее состояние. Если трат за
   * период нет, но у машины они есть, дополнительно подтягивает суммы ближайших периодов.
   */
  async function fetchPeriodReport(query: ExpensesQuery): Promise<PeriodReport> {
    const result = await $fetch<CarAnalytics>(`/api/cars/${toValue(carId)}/analytics`, {
      query: query.date ? { period: query.period, date: query.date } : { period: query.period },
    })
    const isEmptyPeriod = result.total === 0 && result.hasAnyExpenses
    const [prev, next] = await Promise.all(
      [result.prevPeriodWithExpenses, result.nextPeriodWithExpenses].map((date) =>
        isEmptyPeriod && date ? fetchPeriodTotal(query.period, date) : null,
      ),
    )
    return { query, analytics: result, neighbourTotals: { prev: prev ?? null, next: next ?? null } }
  }

  return { analytics, loading, fetchAnalytics, fetchPeriodReport }
}
