<script setup lang="ts">
import { getReminderStatus } from '~~/shared/utils/reminderStatus'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { fetchCar } = useCars()
const { reminders, fetchReminders } = useReminders(carId)

const car = reactive(await fetchCar(carId))
await fetchReminders({ isActive: true })

const alertCount = computed(
  () => reminders.value.filter((r) => ['overdue', 'soon'].includes(getReminderStatus(r, car.currentMileage))).length
)

const tab = ref<'journal' | 'reminders'>(route.query.tab === 'reminders' ? 'reminders' : 'journal')
watch(tab, (value) => {
  navigateTo({ path: route.path, query: { ...route.query, tab: value } }, { replace: true })
})
</script>

<template>
  <div class="pb-20">
    <NuxtLink to="/cars" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Все автомобили</NuxtLink>

    <div class="flex items-center justify-between mt-2 mb-4">
      <h1 class="text-lg font-semibold text-slate-800">{{ car.brand }} {{ car.model }}</h1>
      <NuxtLink v-if="car.role === 'owner'" :to="`/cars/${carId}/edit`" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">
        Изменить
      </NuxtLink>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="card p-4">
        <p class="text-xs text-slate-500">Пробег</p>
        <p class="text-xl font-semibold text-slate-800">{{ car.currentMileage.toLocaleString('ru-RU') }} км</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-slate-500">Гос. номер</p>
        <p class="text-xl font-semibold text-slate-800">{{ car.plateNumber || '—' }}</p>
      </div>
    </div>

    <div v-if="alertCount" class="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
      ⏰ {{ alertCount }} {{ alertCount === 1 ? 'напоминание требует внимания' : 'напоминаний требуют внимания' }}
    </div>

    <EntryJournal v-if="tab === 'journal'" :car-id="carId" />
    <ReminderList v-else :car-id="carId" :current-mileage="car.currentMileage" />

    <div
      class="fixed inset-x-0 bottom-0 z-20 px-4"
      :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }"
    >
      <nav
        class="max-w-3xl mx-auto grid grid-cols-2 rounded-[28px] border border-white/30 bg-white/20 backdrop-blur-md shadow-[0_8px_32px_rgba(15,23,42,0.16)] overflow-hidden"
      >
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
          :class="tab === 'journal' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
          @click="tab = 'journal'"
        >
          <span class="text-lg leading-none">📋</span>
          Журнал
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
          :class="tab === 'reminders' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
          @click="tab = 'reminders'"
        >
          <span class="relative text-lg leading-none">
            ⏰
            <span
              v-if="alertCount"
              class="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
            >{{ alertCount }}</span>
          </span>
          Напоминания
        </button>
      </nav>
    </div>
  </div>
</template>
