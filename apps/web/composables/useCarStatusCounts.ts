import type { Car, Reminder, ReminderStatus } from '@garage/shared/types'
import { countRemindersByStatus } from '@garage/shared/utils/reminderBadge'
import { getReminderRemaining } from '@garage/shared/utils/reminderRemaining'
import { getReminderStatus } from '@garage/shared/utils/reminderStatus'
import { todayIso } from '@garage/shared/utils/format'

/** Ближайшее «скоро» у машины: «ОСАГО» + «через 5 дней» — для бейджа в `UiRowCar` */
export interface NextSoonReminder {
  title: string
  /** Остаток со строчной буквы: «через 5 дней», «через 800 км» */
  remaining: string
}

function findNextSoon(
  reminders: Reminder[],
  currentMileage: number,
  today: string,
): NextSoonReminder | null {
  const soon = reminders
    .filter((reminder) => getReminderStatus(reminder, currentMileage, today) === 'soon')
    .sort((a, b) => (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999'))
  const [first] = soon
  if (!first) return null
  const { headline } = getReminderRemaining(first, { currentMileage, today })
  return { title: first.title, remaining: headline.charAt(0).toLowerCase() + headline.slice(1) }
}

/** Число просроченных/скорых напоминаний по каждой машине — для бейджей в `UiRowCar`. */
export function useCarStatusCounts() {
  const statusCounts = ref<Record<number, Record<ReminderStatus, number>>>({})
  const nextSoon = ref<Record<number, NextSoonReminder | null>>({})

  async function loadStatusCounts(car: Car) {
    const reminders = await $fetch<Reminder[]>(`/api/cars/${car.id}/reminders`, {
      query: { isActive: true },
    })
    const today = todayIso()
    statusCounts.value = {
      ...statusCounts.value,
      [car.id]: countRemindersByStatus(reminders, car.currentMileage, today),
    }
    nextSoon.value = {
      ...nextSoon.value,
      [car.id]: findNextSoon(reminders, car.currentMileage, today),
    }
  }

  async function loadAllStatusCounts(cars: Car[]) {
    // Бейдж — украшение: ошибка одной машины не должна ломать список
    await Promise.all(cars.map((car) => loadStatusCounts(car).catch(() => {})))
  }

  return { statusCounts, nextSoon, loadAllStatusCounts }
}
