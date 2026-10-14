import type { CarDetail, Reminder } from '@garage/shared/types'
import { countAttentionReminders } from '@garage/shared/utils/reminderBadge'
import { todayIso } from '@garage/shared/utils/format'

/**
 * Машина, открытая в `layouts/car.vue`: шапка (название, госномер) и бейдж вкладки
 * «Напоминания». Layout загружает её при смене `carId`; экраны, меняющие напоминания или
 * пробег, вызывают `refreshCurrentCar()`, чтобы бейдж пересчитался.
 */
export function useCurrentCar() {
  const car = useState<CarDetail | null>('currentCar', () => null)
  const attentionCount = useState<number>('currentCarAttention', () => 0)

  async function fetchAttentionCount(carId: number, currentMileage: number) {
    const reminders = await $fetch<Reminder[]>(`/api/cars/${carId}/reminders`, {
      query: { isActive: true },
    })
    return countAttentionReminders(reminders, currentMileage, todayIso())
  }

  async function loadCurrentCar(carId: number) {
    if (car.value?.id !== carId) {
      car.value = null
      attentionCount.value = 0
    }
    const loaded = await $fetch<CarDetail>(`/api/cars/${carId}`)
    car.value = loaded
    attentionCount.value = await fetchAttentionCount(carId, loaded.currentMileage)
  }

  /** Перечитать машину и бейдж — после записи с пробегом или правки напоминаний. */
  async function refreshCurrentCar() {
    if (car.value) await loadCurrentCar(car.value.id)
  }

  return { car, attentionCount, loadCurrentCar, refreshCurrentCar }
}
