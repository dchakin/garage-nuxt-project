import type { Car, Reminder, ReminderStatus } from '@garage/shared/types'
import { countRemindersByStatus } from '@garage/shared/utils/reminderBadge'
import { todayIso } from '@garage/shared/utils/format'

/** Число просроченных/скорых напоминаний по каждой машине — для бейджей в `UiRowCar`. */
export function useCarStatusCounts() {
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

  async function loadAllStatusCounts(cars: Car[]) {
    // Бейдж — украшение: ошибка одной машины не должна ломать список
    await Promise.all(cars.map((car) => loadStatusCounts(car).catch(() => {})))
  }

  return { statusCounts, loadAllStatusCounts }
}
