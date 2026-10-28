<script setup lang="ts">
import { Plus, TriangleAlert, BellOff } from 'lucide-vue-next'
import type { Reminder } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { countAttentionReminders } from '@garage/shared/utils/reminderBadge'
import { averageKmPerMonth, pickNearestReminder } from '@garage/shared/utils/reminderRemaining'
import type { ReminderTemplateChoice } from '@garage/shared/utils/reminderTemplates'

// Экран «Напоминания» (Г1/Г2/Г3/Т3). Файл reminders/index.vue, а не reminders.vue:
// иначе подкаталог reminders/ сделал бы вкладки вложенными маршрутами.
definePageMeta({ middleware: 'auth', layout: 'car' })

/** Скелетон показываем, только если данные идут дольше этого, мс (иначе мелькает на быстрой сети) */
const SKELETON_DELAY_MS = 300

const route = useRoute()
const carId = computed(() => Number(route.params.id))
const { car } = useCurrentCar()
const { reminders: loadedReminders, fetchReminders } = useReminders(carId)
const { entries, fetchEntries } = useEntries(carId)
const {
  open: openReminderEdit,
  hiddenIds,
  changedCount: reminderChangedCount,
} = useReminderEditSheet()
// Удаляемое (ждёт «Отменить») напоминание пропадает сразу, до DELETE
const reminders = computed(() =>
  loadedReminders.value.filter((reminder) => !hiddenIds.value.includes(reminder.id)),
)

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
// «Ближайший срок — ГРМ через 12 550 км» в Г3
const nearestText = computed(() => {
  if (!currentCar.value) return ''
  const nearest = pickNearestReminder(reminders.value, {
    currentMileage: currentCar.value.currentMileage,
    today,
    avgKmPerMonth: avgKmPerMonth.value,
  })
  if (!nearest) return ''
  const { headline } = nearest.remaining
  return `Ближайший срок — ${nearest.reminder.title} ${headline.charAt(0).toLowerCase()}${headline.slice(1)}.`
})

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
const { savedCount: reminderSavedCount, open: openReminderSheet } = useReminderSheet()
watch([savedCount, changedCount, reminderSavedCount, reminderChangedCount], async () => {
  try {
    await Promise.all([fetchReminders(), fetchEntries()])
  } catch {
    // Остаются прежние данные; сеть отсутствует — плашка в layout
  }
})
onBeforeUnmount(() => clearTimeout(skeletonTimer))

const { open: openEntrySheet } = useEntrySheet()
function startFromTemplate(choice: ReminderTemplateChoice | null) {
  if (choice) openReminderSheet({ carId: carId.value, choice })
}

function markDone(reminder: Reminder) {
  openEntrySheet({ carId: carId.value, reminder })
}
</script>

<template>
  <div class="flex flex-col gap-sp-4 pt-sp-2" :aria-busy="loading">
    <div class="flex items-center justify-between gap-sp-3">
      <h1 class="text-h1 text-text">Напоминания</h1>
      <UiButton
        v-if="ready"
        variant="tonal"
        size="sm"
        :icon="Plus"
        @click="openReminderSheet({ carId })"
      >
        Добавить
      </UiButton>
    </div>

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
      <section v-if="!reminders.length" class="flex flex-1 flex-col justify-between gap-sp-6">
        <UiEmptyState
          :icon="BellOff"
          title="Напоминаний пока нет"
          message="Выберите, о чём напомнить — сроки посчитаем сами и пришлём push заранее."
          class="pt-sp-8"
        />
        <div class="flex flex-col items-center gap-sp-3 pb-sp-6">
          <p class="text-sm font-semibold text-text-2">Частые сроки — нажмите, чтобы создать</p>
          <ReminderTemplates
            :model-value="null"
            :created-ids="[]"
            class="justify-center"
            @update:model-value="startFromTemplate"
          />
        </div>
      </section>

      <template v-else>
        <UiAlert
          v-if="allInOrder"
          variant="success"
          title="Всё под контролем"
          :message="nearestText"
        />
        <ReminderGroups
          :reminders="reminders"
          :current-mileage="currentCar.currentMileage"
          :avg-km-per-month="avgKmPerMonth"
          :today="today"
          @open="openReminderEdit"
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
