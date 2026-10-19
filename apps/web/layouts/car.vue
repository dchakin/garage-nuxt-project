<script setup lang="ts">
/**
 * Экраны машины с нижней панелью: «Обзор», «Журнал», «Напоминания», «Расходы».
 * Шапка AppBar/Car (тап по названию → переключатель машин «Б4»), снизу — TabBar с бейджем
 * просроченных + скорых напоминаний. Машина берётся из `route.params.id` и запоминается
 * как последняя открытая (`useLastCar`).
 */
import { carTabPath, type CarTab } from '~/utils/carTabs'

/** Имя маршрута (файловый роутинг Nuxt) → вкладка панели */
const TAB_BY_ROUTE_NAME: Record<string, CarTab> = {
  'cars-id': 'overview',
  'cars-id-journal': 'journal',
  'cars-id-reminders': 'reminders',
  'cars-id-expenses': 'expenses',
}

const route = useRoute()
const { user } = useAuth()
const { car, attentionCount, loadCurrentCar } = useCurrentCar()
const { rememberLastCar, forgetLastCar } = useLastCar()

const carId = computed(() => Number(route.params.id))
const activeTab = computed(() => TAB_BY_ROUTE_NAME[String(route.name)] ?? null)
const switcherOpen = ref(false)

const CAR_UNAVAILABLE_STATUSES = [403, 404]

async function openCar(id: number) {
  try {
    await loadCurrentCar(id)
    rememberLastCar(id)
  } catch (error: any) {
    // Машину удалили или доступ отозвали — не открывать её снова с `/`
    if (!CAR_UNAVAILABLE_STATUSES.includes(error?.statusCode)) throw error
    forgetLastCar()
    await navigateTo('/cars', { replace: true })
  }
}

watch(carId, (id) => Number.isInteger(id) && openCar(id), { immediate: true })

watch(
  () => route.fullPath,
  () => (switcherOpen.value = false),
)

async function switchCar(nextCarId: number) {
  switcherOpen.value = false
  await navigateTo(carTabPath(nextCarId, activeTab.value ?? 'overview'))
}

// Toast выводится в app.vue, вне layout, — переменная ставится на <html>.
// Toast сам добавляет safe-area; 84 = панель 76 + минимальный отступ снизу 8.
const TOAST_ABOVE_TAB_BAR = 'calc(84px + var(--sp-2))'
onMounted(() => document.documentElement.style.setProperty('--toast-bottom', TOAST_ABOVE_TAB_BAR))
onBeforeUnmount(() => document.documentElement.style.removeProperty('--toast-bottom'))

const { open: openEntrySheet } = useEntrySheet()
</script>

<template>
  <div class="min-h-screen bg-bg pb-[calc(76px+max(env(safe-area-inset-bottom),8px))]">
    <UiAppBar
      variant="car"
      class="sticky top-0 z-10"
      :car-name="car ? `${car.brand} ${car.model}` : ''"
      :plate-number="car?.plateNumber"
      :user-name="user?.name ?? ''"
      @switch="switcherOpen = true"
    />
    <main class="mx-auto max-w-3xl px-sp-4 pb-sp-6">
      <OfflineBanner />
      <slot />
    </main>
    <UiTabBar
      :car-id="carId"
      :active="activeTab"
      :badge="attentionCount"
      class="fixed inset-x-0 bottom-0 z-20"
      @add="openEntrySheet({ carId })"
    />
    <EntrySheet />
    <CarSwitcherSheet
      v-if="car"
      v-model:open="switcherOpen"
      :current-car="car"
      @select="switchCar"
    />
  </div>
</template>
