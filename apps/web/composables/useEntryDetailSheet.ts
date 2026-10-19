import { readonly, ref, shallowRef } from 'vue'
import type { Entry } from '@garage/shared/types'

// Одна шторка на приложение (SPA, без SSR). Саму шторку выводит `<EntryDetailSheet />`
// в `layouts/car.vue`.
const isOpen = ref(false)
const entry = shallowRef<Entry | null>(null)
const hiddenIds = ref<number[]>([])
const changedCount = ref(0)

/**
 * Глобальное состояние шторки записи (Д4): просмотр, правка, удаление. Строка записи
 * (`UiRowEntry`) зовёт `open(entry)`. Пока идёт отложенное удаление, запись числится в
 * `hiddenIds` — списки отфильтровывают её сразу; после правки или удаления растёт
 * `changedCount`, по нему экраны с данными перечитывают список.
 */
export function useEntryDetailSheet() {
  function open(next: Entry) {
    entry.value = next
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Убрать запись из списков до того, как DELETE дойдёт до сервера. */
  function hide(entryId: number) {
    if (!hiddenIds.value.includes(entryId)) hiddenIds.value = [...hiddenIds.value, entryId]
  }

  /** «Отменить» или ошибка удаления — вернуть запись в списки. */
  function restore(entryId: number) {
    hiddenIds.value = hiddenIds.value.filter((id) => id !== entryId)
  }

  /** Вызывает шторка после правки и после выполненного DELETE. */
  function notifyChanged() {
    changedCount.value += 1
  }

  return {
    isOpen,
    entry: readonly(entry),
    hiddenIds: readonly(hiddenIds),
    changedCount: readonly(changedCount),
    open,
    close,
    hide,
    restore,
    notifyChanged,
  }
}
