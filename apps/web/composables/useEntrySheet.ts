import { readonly, ref, shallowRef } from 'vue'
import type { Reminder } from '@garage/shared/types'

export interface EntrySheetOptions {
  carId: number
  /** Напоминание, которое закрывает запись («Сделал», этап 8) */
  reminder?: Reminder | null
}

// Одна шторка на приложение: клиент — SPA (без SSR), поэтому модульное состояние безопасно.
// Саму шторку выводит `<EntrySheet />` в `layouts/car.vue`.
const isOpen = ref(false)
const options = shallowRef<EntrySheetOptions | null>(null)
const savedCount = ref(0)

/**
 * Глобальное состояние шторки новой записи. «＋» в `layouts/car.vue`, кнопки «Добавить запись»
 * и «Сделал» зовут `open({ carId, reminder? })`; экраны с данными следят за `savedCount` и
 * перечитывают список после сохранения.
 */
export function useEntrySheet() {
  function open(next: EntrySheetOptions) {
    options.value = next
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Вызывает сама шторка после успешного сохранения. */
  function notifySaved() {
    savedCount.value += 1
  }

  return {
    isOpen,
    options: readonly(options),
    savedCount: readonly(savedCount),
    open,
    close,
    notifySaved,
  }
}
