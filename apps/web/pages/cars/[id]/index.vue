<script setup lang="ts">
import { formatMileage } from '@garage/shared/utils/format'
import { getReminderStatus } from '@garage/shared/utils/reminderStatus'
import { Bell, CircleAlert, NotebookText } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { fetchCar } = useCars()
const { reminders, fetchReminders } = useReminders(carId)

const car = reactive(await fetchCar(carId))
await fetchReminders({ isActive: true })

const alertCount = computed(
  () =>
    reminders.value.filter((r) =>
      ['overdue', 'soon'].includes(getReminderStatus(r, car.currentMileage)),
    ).length,
)

const tab = ref<'journal' | 'reminders'>(route.query.tab === 'reminders' ? 'reminders' : 'journal')
watch(tab, (value) => {
  navigateTo({ path: route.path, query: { ...route.query, tab: value } }, { replace: true })
})
</script>

<template>
  <div class="pb-20">
    <BackLink to="/cars">Все автомобили</BackLink>

    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-2 mb-4">
      <h1 class="text-h1 text-text">{{ car.brand }} {{ car.model }}</h1>
      <NuxtLink
        v-if="car.role === 'owner'"
        :to="`/cars/${carId}/edit`"
        class="text-sm text-text-2 hover:text-text transition-colors"
      >
        Изменить
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="card p-4">
        <p class="text-xs text-text-2">Пробег</p>
        <p class="text-h2 text-text">{{ formatMileage(car.currentMileage) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-text-2">Гос. номер</p>
        <p class="font-mono text-h2 text-text">{{ car.plateNumber || '—' }}</p>
      </div>
    </div>

    <div
      v-if="alertCount"
      class="mb-4 flex items-center gap-2 rounded-md bg-warning-soft border border-warning px-3 py-2 text-sm text-warning-text"
    >
      <CircleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {{ alertCount }}
        {{ alertCount === 1 ? 'напоминание требует внимания' : 'напоминаний требуют внимания' }}
      </span>
    </div>

    <EntryJournal v-if="tab === 'journal'" :car-id="carId" />
    <ReminderList v-else :car-id="carId" :current-mileage="car.currentMileage" />

    <div
      class="fixed inset-x-0 bottom-0 z-20 px-4"
      :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }"
    >
      <nav
        class="max-w-3xl mx-auto grid grid-cols-2 rounded-xl border border-border bg-surface shadow-md overflow-hidden"
      >
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
          :class="tab === 'journal' ? 'text-accent-text' : 'text-text-2 hover:text-text'"
          @click="tab = 'journal'"
        >
          <NotebookText class="h-6 w-6" aria-hidden="true" />
          Журнал
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
          :class="tab === 'reminders' ? 'text-accent-text' : 'text-text-2 hover:text-text'"
          @click="tab = 'reminders'"
        >
          <span class="relative">
            <Bell class="h-6 w-6" aria-hidden="true" />
            <span
              v-if="alertCount"
              class="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-2xs font-semibold text-on-danger"
              >{{ alertCount }}</span
            >
          </span>
          Напоминания
        </button>
      </nav>
    </div>
  </div>
</template>
