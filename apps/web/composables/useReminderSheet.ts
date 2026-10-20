import { readonly, ref, shallowRef } from 'vue'
import type { Reminder } from '@garage/shared/types'

export interface ReminderSheetOptions {
  carId: number
}

// Одна шторка на приложение (SPA, без SSR — модульное состояние безопасно), как `useEntrySheet`.
// Саму шторку выводит `<ReminderSheet />` в `layouts/car.vue`.
const isOpen = ref(false)
const options = shallowRef<ReminderSheetOptions | null>(null)
const savedCount = ref(0)
const openExistingRequest = shallowRef<Reminder | null>(null)

/**
 * Глобальное состояние шторки нового напоминания (Е1–Е3). Кнопки «Добавить напоминание» зовут
 * `open({ carId })`; экран «Напоминания» следит за `savedCount` и перечитывает список.
 * «Открыть «…»» в Е3 закрывает шторку и кладёт напоминание в `openExistingRequest` —
 * его подхватит шторка правки (Е4).
 */
export function useReminderSheet() {
  function open(next: ReminderSheetOptions) {
    options.value = next
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Вызывает сама шторка после успешного создания. */
  function notifySaved() {
    savedCount.value += 1
  }

  /** Е3 «Открыть «…»»: закрыть шторку создания и попросить открыть существующее напоминание. */
  function requestOpenExisting(reminder: Reminder) {
    isOpen.value = false
    openExistingRequest.value = reminder
  }

  function clearOpenExistingRequest() {
    openExistingRequest.value = null
  }

  return {
    isOpen,
    options: readonly(options),
    savedCount: readonly(savedCount),
    openExistingRequest: readonly(openExistingRequest),
    open,
    close,
    notifySaved,
    requestOpenExisting,
    clearOpenExistingRequest,
  }
}
