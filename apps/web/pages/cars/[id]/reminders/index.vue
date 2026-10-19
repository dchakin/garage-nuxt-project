<script setup lang="ts">
import { PartyPopper, Plus, TriangleAlert, BellOff } from 'lucide-vue-next'
import type { Reminder } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { countAttentionReminders } from '@garage/shared/utils/reminderBadge'
import { averageKmPerMonth } from '@garage/shared/utils/reminderRemaining'

// Экран «Напоминания» (Г1/Г2/Г3/Т3). Файл reminders/index.vue, а не reminders.vue:
// иначе reminders/new.vue стал бы вложенным маршрутом.
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { car } = useCurrentCar()
const { reminders, fetchReminders } = useReminders(carId)
const { entries, fetchEntries } = useEntries(carId)

const today = todayIso()
const loading = ref(true)
const failed = ref(false)
const skeletonVisible = ref(false)
/** Машина, чьи данные уже загружены хотя бы раз: при сбое повторной загрузки их не стираем */
const loadedCarId = ref<number | null>(null)
const avgKmPerMonth = computed(() => averageKmPerMonth(entries.value))
const currentCar = computed(() => (car.value?.id === carId.value ? car.value : null))
const ready = computed(() => !failed.value && currentCar.value && loadedCarId.value === carId.value)
// Г3: напоминания есть, и ни одно не просрочено и не «скоро»
const allInOrder = computed(
  () =>
    !!currentCar.value &&
    reminders.value.some((reminder) => reminder.isActive) &&
    countAttentionReminders(reminders.value, currentCar.value.currentMileage, today) === 0,
)

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
    await Promise.all([fetchReminders(), fetchEntries()])
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

// Запись добавлена из шторки — пробег и сроки могли сдвинуться; перечитываем молча
const { savedCount } = useEntrySheet()
const { changedCount } = useEntryDetailSheet()
watch([savedCount, changedCount], async () => {
  try {
    await Promise.all([fetchReminders(), fetchEntries()])
  } catch {
    // Остаются прежние данные; сеть отсутствует — плашка в layout
  }
})
onBeforeUnmount(() => clearTimeout(skeletonTimer))

// Правка — прежняя страница напоминания до шторки Е4 (#63)
function openReminder(reminder: Reminder) {
  navigateTo(`/cars/${carId.value}/reminders/${reminder.id}`)
}

const { open: openEntrySheet } = useEntrySheet()
function markDone(reminder: Reminder) {
  openEntrySheet({ carId: carId.value, reminder })
}
</script>

<template>
  <div class="flex flex-col gap-sp-4 pt-sp-2" :aria-busy="loading">
    <h1 class="sr-only">Напоминания</h1>

    <UiCard v-if="failed" tag="section">
      <UiEmptyState
        :icon="TriangleAlert"
        tone="danger"
        title="Не удалось загрузить напоминания"
        message="Проверьте соединение и попробуйте ещё раз."
      >
        <template #action>
          <UiButton variant="secondary" @click="load">Повторить</UiButton>
        </template>
      </UiEmptyState>
    </UiCard>

    <template v-else-if="ready && currentCar">
      <UiCard v-if="!reminders.length" tag="section">
        <UiEmptyState
          :icon="BellOff"
          title="Напоминаний пока нет"
          message="Добавьте замену масла, ОСАГО или техосмотр — Гараж подскажет, когда подходит срок."
        >
          <template #action>
            <UiButton :to="`/cars/${carId}/reminders/new`" :icon="Plus">
              Добавить напоминание
            </UiButton>
          </template>
        </UiEmptyState>
      </UiCard>

      <template v-else>
        <div class="flex justify-end">
          <UiButton :to="`/cars/${carId}/reminders/new`" size="sm" :icon="Plus">
            Добавить напоминание
          </UiButton>
        </div>
        <UiAlert
          v-if="allInOrder"
          variant="success"
          :icon="PartyPopper"
          title="Всё в порядке"
          message="Просроченных и ближайших сроков нет."
        />
        <ReminderGroups
          :reminders="reminders"
          :current-mileage="currentCar.currentMileage"
          :avg-km-per-month="avgKmPerMonth"
          :today="today"
          @open="openReminder"
          @done="markDone"
        />
      </template>
    </template>

    <template v-else-if="skeletonVisible">
      <UiSkeleton variant="line" class="h-6 w-[140px]" />
      <UiSkeleton variant="card" class="h-[132px]" />
      <UiSkeleton variant="card" class="h-[132px]" />
      <UiSkeleton variant="card" class="h-[132px]" />
    </template>
  </div>
</template>
