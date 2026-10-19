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
const { reminders, fetchReminders } = useReminders(carId)
const { entries, fetchEntries } = useEntries(carId)
const { analytics, fetchAnalytics } = useAnalytics(carId)

const today = todayIso()
const loading = ref(true)
const failed = ref(false)
const skeletonVisible = ref(false)
const avgKmPerMonth = computed(() => averageKmPerMonth(entries.value))
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
  } catch {
    if (token === loadToken) failed.value = true
  } finally {
    if (token === loadToken) {
      loading.value = false
      clearTimeout(skeletonTimer)
    }
  }
}

watch(carId, (id) => Number.isInteger(id) && load(), { immediate: true })
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
      <OverviewMileageCard
        :mileage="currentCar.currentMileage"
        :updated-at="currentCar.mileageUpdatedAt"
        :today="today"
      />
      <OverviewAttentionList
        :car-id="carId"
        :reminders="reminders"
        :current-mileage="currentCar.currentMileage"
        :avg-km-per-month="avgKmPerMonth"
        :today="today"
      />
      <OverviewMonthExpensesCard :analytics="analytics" :today="today" />
      <OverviewRecentEntries :car-id="carId" :entries="entries" :today="today" />
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
