import { readonly, ref, shallowRef } from 'vue'
import type { Reminder } from '@garage/shared/types'

// Одна шторка на приложение (SPA, без SSR). Саму шторку выводит `<ReminderEditSheet />`
// в `layouts/car.vue`.
const isOpen = ref(false)
const reminder = shallowRef<Reminder | null>(null)
const hiddenIds = ref<number[]>([])
const changedCount = ref(0)

/**
 * Глобальное состояние шторки правки напоминания (Е4). Карточка напоминания зовёт
 * `open(reminder)`. Пока идёт отложенное удаление, напоминание числится в `hiddenIds` — списки
 * отфильтровывают его сразу; после правки или удаления растёт `changedCount`, по нему экраны
 * с данными перечитывают список.
 */
export function useReminderEditSheet() {
  function open(next: Reminder) {
    reminder.value = next
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Убрать напоминание из списков до того, как DELETE дойдёт до сервера. */
  function hide(reminderId: number) {
    if (!hiddenIds.value.includes(reminderId)) hiddenIds.value = [...hiddenIds.value, reminderId]
  }

  /** «Отменить» или ошибка удаления — вернуть напоминание в списки. */
  function restore(reminderId: number) {
    hiddenIds.value = hiddenIds.value.filter((id) => id !== reminderId)
  }

  /** Вызывает шторка после правки и после выполненного DELETE. */
  function notifyChanged() {
    changedCount.value += 1
  }

  return {
    isOpen,
    reminder: readonly(reminder),
    hiddenIds: readonly(hiddenIds),
    changedCount: readonly(changedCount),
    open,
    close,
    hide,
    restore,
    notifyChanged,
  }
}
