<script setup lang="ts">
import { CalendarX, ChartColumn, Plus, TriangleAlert } from 'lucide-vue-next'
import type { AnalyticsPeriod } from '@garage/shared/schemas/analytics'
import { todayIso } from '@garage/shared/utils/format'
import type { PeriodReport } from '~/composables/useAnalytics'
import {
  canShowNext,
  changePeriod,
  currentQuery,
  describeEmptyPeriod,
  expensesPeriodOptions,
  formatPeriodLabel,
  shiftQuery,
  type ExpensesQuery,
} from '~/utils/expensesPeriod'

// Экран «Расходы» (Ж1/Ж2/Ж3/Т6): период, сумма и метрики, графики по месяцам и категориям
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { fetchPeriodReport } = useAnalytics(carId)

const today = todayIso()
const report = ref<PeriodReport | null>(null)
const loading = ref(true)
const failed = ref(false)
const skeletonVisible = ref(false)

let skeletonTimer: ReturnType<typeof setTimeout> | undefined
let loadToken = 0

/**
 * Грузит период и подменяет им экран целиком: пока идёт запрос, виден прежний период, поэтому
 * переключатель и данные не расходятся. `silent` — перечитать без скелетона и экрана ошибки.
 */
async function load(query: ExpensesQuery, { silent = false } = {}) {
  const token = ++loadToken
  loading.value = true
  if (!silent) {
    failed.value = false
    skeletonVisible.value = false
    clearTimeout(skeletonTimer)
    skeletonTimer = setTimeout(() => (skeletonVisible.value = true), SKELETON_DELAY_MS)
  }
  try {
    const loaded = await fetchPeriodReport(query)
    if (token === loadToken) report.value = loaded
  } catch {
    // Прежний период остаётся на экране (нет сети — плашка в layout), ошибка — только без данных
    if (token === loadToken && !report.value) failed.value = true
  } finally {
    if (token === loadToken) {
      loading.value = false
      clearTimeout(skeletonTimer)
    }
  }
}

const DEFAULT_PERIOD: AnalyticsPeriod = 'year'
watch(
  carId,
  (id) => {
    if (!Number.isInteger(id)) return
    report.value = null
    load(currentQuery(DEFAULT_PERIOD, today))
  },
  { immediate: true },
)

const query = computed(() => report.value?.query ?? currentQuery(DEFAULT_PERIOD, today))
const analytics = computed(() => report.value?.analytics ?? null)
const isEmptyPeriod = computed(() => analytics.value?.total === 0)
const canPrev = computed(
  () => query.value.period !== 'all' && analytics.value?.prevPeriodWithExpenses != null,
)
const canNext = computed(() => canShowNext(query.value, today))
const emptyPeriod = computed(() =>
  report.value && isEmptyPeriod.value
    ? describeEmptyPeriod(report.value.query, report.value.analytics, report.value.neighbourTotals)
    : null,
)

function showQuery(next: ExpensesQuery) {
  if (!loading.value) load(next)
}

// Запись добавлена, изменена или удалена — суммы поменялись; перечитываем молча
const { savedCount, open: openEntrySheet } = useEntrySheet()
const { changedCount } = useEntryDetailSheet()
watch([savedCount, changedCount], () => report.value && load(report.value.query, { silent: true }))
onBeforeUnmount(() => clearTimeout(skeletonTimer))
</script>

<template>
  <div class="flex flex-col gap-sp-6 pt-sp-2" :aria-busy="loading">
    <h1 class="sr-only">Расходы</h1>

    <UiCard v-if="failed" tag="section">
      <UiEmptyState
        :icon="TriangleAlert"
        tone="danger"
        title="Не удалось загрузить расходы"
        message="Проверьте соединение и попробуйте ещё раз."
      >
        <template #action>
          <UiButton variant="secondary" @click="load(query)">Повторить</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>

    <template v-else-if="report && analytics">
      <!-- Ж2: у машины нет ни одной траты — переключать нечего -->
      <UiCard v-if="!analytics.hasAnyExpenses" tag="section">
        <UiEmptyState
          :icon="ChartColumn"
          title="Пока нет трат"
          message="Добавьте запись со стоимостью — здесь появятся суммы по месяцам и категориям."
        >
          <template #action>
            <UiButton :icon="Plus" @click="openEntrySheet({ carId })">Добавить запись</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>

      <template v-else>
        <UiSegmented
          :model-value="query.period"
          :options="expensesPeriodOptions"
          label="Период"
          @update:model-value="(period) => showQuery(changePeriod(query, period, today))"
        />
        <div v-if="query.period !== 'all'" class="flex justify-center">
          <UiPeriodSwitcher
            :label="formatPeriodLabel(query)"
            :can-prev="canPrev"
            :can-next="canNext"
            @prev="showQuery(shiftQuery(query, -1))"
            @next="showQuery(shiftQuery(query, 1))"
          />
        </div>

        <!-- Ж3: за выбранный период трат нет -->
        <UiCard v-if="emptyPeriod" tag="section" data-testid="expenses-empty-period">
          <UiEmptyState :icon="CalendarX" :title="emptyPeriod.title" :message="emptyPeriod.message">
            <template v-if="emptyPeriod.target" #action>
              <UiButton variant="secondary" @click="showQuery(emptyPeriod.target)">
                {{ emptyPeriod.actionLabel }}
              </UiButton>
            </template>
          </UiEmptyState>
        </UiCard>

        <template v-else>
          <ExpensesSummary :analytics="analytics" :period="query.period" :today="today" />
          <ExpensesCharts :analytics="analytics" :query="query" :today="today" />
        </template>
      </template>
    </template>

    <template v-else-if="skeletonVisible">
      <UiSkeleton variant="line" class="h-10 w-full" />
      <UiSkeleton variant="line" class="h-5 w-[180px]" />
      <UiSkeleton variant="card" class="h-[200px]" />
      <UiSkeleton variant="card" class="h-[132px]" />
    </template>
  </div>
</template>
