<script setup lang="ts">
import { getReminderStatus } from '@garage/shared/utils/reminderStatus'

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
    <NuxtLink to="/cars" class="text-sm text-text-2 hover:text-text transition-colors"
      >← Все автомобили</NuxtLink
    >

    <div class="flex items-center justify-between mt-2 mb-4">
      <h1 class="text-lg font-semibold text-text">{{ car.brand }} {{ car.model }}</h1>
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
        <p class="text-xl font-semibold text-text">
          {{ car.currentMileage.toLocaleString('ru-RU') }} км
        </p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-text-2">Гос. номер</p>
        <p class="text-xl font-semibold text-text">{{ car.plateNumber || '—' }}</p>
      </div>
    </div>

    <div
      v-if="alertCount"
      class="mb-4 rounded-md bg-warning-soft border border-warning px-3 py-2 text-sm text-warning-text"
    >
      ⏰ {{ alertCount }}
      {{ alertCount === 1 ? 'напоминание требует внимания' : 'напоминаний требуют внимания' }}
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
          <span class="text-lg leading-none">📋</span>
          Журнал
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
          :class="tab === 'reminders' ? 'text-accent-text' : 'text-text-2 hover:text-text'"
          @click="tab = 'reminders'"
        >
          <span class="relative text-lg leading-none">
            ⏰
            <span
              v-if="alertCount"
              class="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-danger"
              >{{ alertCount }}</span
            >
          </span>
          Напоминания
        </button>
      </nav>
    </div>
  </div>
</template>
