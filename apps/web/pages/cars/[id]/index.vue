<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { todayIso } from '@garage/shared/utils/format'
import { averageKmPerMonth } from '@garage/shared/utils/reminderRemaining'

// Экран «Обзор» (Б1/Б2/Т1): пробег, «Требует внимания», расходы месяца, последние записи
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { car } = useCurrentCar()
const { reminders: loadedReminders, fetchReminders } = useReminders(carId)
const {
  open: openReminderEdit,
  hiddenIds: hiddenReminderIds,
  changedCount: reminderChangedCount,
} = useReminderEditSheet()
// Удаляемое (ждёт «Отменить») напоминание пропадает сразу, до DELETE
const reminders = computed(() =>
  loadedReminders.value.filter((reminder) => !hiddenReminderIds.value.includes(reminder.id)),
)
const { entries, fetchEntries } = useEntries(carId)
const { analytics, fetchAnalytics } = useAnalytics(carId)
const { banner: onboardingBanner, dismissBanner: dismissOnboardingBanner } = useOnboardingBanner()

const today = todayIso()
const loading = ref(true)
const failed = ref(false)
const skeletonVisible = ref(false)
/** Машина, чьи данные уже загружены хотя бы раз: при сбое повторной загрузки их не стираем */
const loadedCarId = ref<number | null>(null)
const avgKmPerMonth = computed(() => averageKmPerMonth(entries.value))
// Удаляемая запись (ждёт «Отменить») уже убрана из UI: список и сумма месяца пересчитаны сразу
const visibleEntries = computed(() =>
  entries.value.filter((entry) => !hiddenIds.value.includes(entry.id)),
)
const shownAnalytics = computed(() =>
  analytics.value
    ? analyticsWithoutEntries(
        analytics.value,
        entries.value.filter((entry) => hiddenIds.value.includes(entry.id)),
        today.slice(0, 7),
      )
    : null,
)
const currentCar = computed(() => (car.value?.id === carId.value ? car.value : null))
const ready = computed(() => !loading.value && !failed.value && currentCar.value && analytics.value)

let skeletonTimer: ReturnType<typeof setTimeout> | undefined
let loadToken = 0

async function load() {
  const token = ++loadToken
  loading.value = true
  failed.value = false
  skeletonVisible.value = false
  clearTimeout(skeletonTimer)
  skeletonTimer = setTimeout(() => (skeletonVisible.value = true), SKELETON_DELAY_MS)
  try {
    await Promise.all([fetchReminders({ isActive: true }), fetchEntries(), fetchAnalytics()])
    if (token === loadToken) loadedCarId.value = carId.value
  } catch {
    // Уже показанные данные этой машины остаются (нет сети — плашка в layout), не экран ошибки
    if (token === loadToken && loadedCarId.value !== carId.value) failed.value = true
  } finally {
    if (token === loadToken) {
      loading.value = false
      clearTimeout(skeletonTimer)
    }
  }
}

watch(carId, (id) => Number.isInteger(id) && load(), { immediate: true })

// Запись добавлена из шторки — суммы, пробег и «Требует внимания» могли измениться;
// перечитываем молча, без скелетона: прежние данные остаются на экране
const { savedCount, open: openEntrySheet } = useEntrySheet()
const { open: openEntryDetail, hiddenIds, changedCount } = useEntryDetailSheet()
const { savedCount: mileageSavedCount, open: openMileageSheet } = useMileageSheet()
watch([savedCount, changedCount, reminderChangedCount, mileageSavedCount], async () => {
  try {
    await Promise.all([fetchReminders({ isActive: true }), fetchEntries(), fetchAnalytics()])
  } catch {
    // Остаются прежние данные; сеть отсутствует — плашка в layout
  }
})
onBeforeUnmount(() => clearTimeout(skeletonTimer))
</script>

<template>
  <div class="flex flex-col gap-sp-6 pt-sp-2" :aria-busy="loading">
    <h1 class="sr-only">Обзор</h1>

    <UiCard v-if="failed" tag="section">
      <UiEmptyState
        :icon="TriangleAlert"
        tone="danger"
        title="Не удалось загрузить обзор"
        message="Проверьте соединение и попробуйте ещё раз."
      >
        <template #action>
          <UiButton variant="secondary" @click="load">Повторить</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>

    <template v-else-if="ready && currentCar && analytics">
      <OverviewOnboardingBanner
        v-if="onboardingBanner?.carId === carId"
        :count="onboardingBanner.count"
        @dismiss="dismissOnboardingBanner"
      />
      <OverviewMileageCard
        :mileage="currentCar.currentMileage"
        :updated-at="currentCar.mileageUpdatedAt"
        :today="today"
        @update="openMileageSheet"
      />
      <OverviewAttentionList
        :car-id="carId"
        :reminders="reminders"
        :current-mileage="currentCar.currentMileage"
        :avg-km-per-month="avgKmPerMonth"
        :today="today"
        @open="openReminderEdit"
        @done="(reminder) => openEntrySheet({ carId, reminder })"
      />
      <OverviewMonthExpensesCard :analytics="shownAnalytics ?? analytics" :today="today" />
      <OverviewRecentEntries
        :car-id="carId"
        :entries="visibleEntries"
        :today="today"
        @open="openEntryDetail"
        @add="openEntrySheet({ carId })"
      />
    </template>

    <template v-else-if="skeletonVisible">
      <UiSkeleton variant="card" class="h-[116px]" />
      <div class="flex flex-col gap-sp-3">
        <UiSkeleton variant="line" class="h-5 w-[180px]" />
        <UiSkeleton variant="card" class="h-[132px]" />
        <UiSkeleton variant="card" class="h-[132px]" />
      </div>
      <div class="flex flex-col gap-sp-3">
        <UiSkeleton variant="line" class="h-5 w-[200px]" />
        <UiCard>
          <UiSkeleton v-for="row in 3" :key="row" variant="row" />
        </UiCard>
      </div>
    </template>
  </div>
</template>
