<script setup lang="ts">
/**
 * Переключатель машин (макет «Б4»): список машин пользователя со статусом напоминаний,
 * выбранная — с галочкой. Тап по машине → `select(carId)`, родитель переходит и закрывает шторку.
 * Внизу — настройки текущей машины и «Добавить машину» (пока ведёт на список машин).
 */
import { Plus, Settings } from 'lucide-vue-next'
import type { Car, Reminder, ReminderStatus } from '@garage/shared/types'
import { countRemindersByStatus } from '@garage/shared/utils/reminderBadge'
import { todayIso } from '@garage/shared/utils/format'

const props = defineProps<{
  currentCar: Pick<Car, 'id' | 'brand' | 'model'>
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ select: [carId: number] }>()

const { cars, fetchCars } = useCars()
const statusCounts = ref<Record<number, Record<ReminderStatus, number>>>({})

async function loadStatusCounts(car: Car) {
  const reminders = await $fetch<Reminder[]>(`/api/cars/${car.id}/reminders`, {
    query: { isActive: true },
  })
  statusCounts.value = {
    ...statusCounts.value,
    [car.id]: countRemindersByStatus(reminders, car.currentMileage, todayIso()),
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await fetchCars()
  await Promise.all(cars.value.map(loadStatusCounts))
})

function onSelect(carId: number) {
  if (carId === props.currentCar.id) open.value = false
  else emit('select', carId)
}
</script>

<template>
  <UiSheet v-model:open="open" title="Мои машины">
    <ul class="flex flex-col gap-sp-3" aria-label="Машины">
      <li v-for="car in cars" :key="car.id">
        <UiRowCar
          :car="car"
          :selected="car.id === currentCar.id"
          :overdue-count="statusCounts[car.id]?.overdue"
          :soon-count="statusCounts[car.id]?.soon"
          @select="onSelect(car.id)"
        />
      </li>
    </ul>
    <p class="mt-sp-3 text-sm text-text-2">
      Нажмите на машину, чтобы переключиться. Приложение запомнит выбор.
    </p>
    <UiCard class="mt-sp-4">
      <UiRowSetting
        :icon="Settings"
        :label="`Настройки ${currentCar.brand} ${currentCar.model}`"
        :to="`/cars/${currentCar.id}/settings`"
      />
    </UiCard>
    <template #footer>
      <UiButton variant="tonal" :icon="Plus" to="/cars" class="w-full">Добавить машину</UiButton>
    </template>
  </UiSheet>
</template>
