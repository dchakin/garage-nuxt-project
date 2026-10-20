import { readonly, ref } from 'vue'

// Одна шторка на приложение (SPA, без SSR). Саму шторку выводит `<MileageSheet />`
// в `layouts/car.vue`.
const isOpen = ref(false)
const savedCount = ref(0)

/**
 * Глобальное состояние шторки обновления пробега (Б5–Б7). Кнопка «Обновить» зовёт `open()`;
 * машина берётся из `useCurrentCar()`. После сохранения растёт `savedCount` — экраны с
 * напоминаниями и пробегом перечитывают данные по `watch(savedCount)`.
 */
export function useMileageSheet() {
  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  /** Вызывает сама шторка после успешного сохранения. */
  function notifySaved() {
    savedCount.value += 1
  }

  return { isOpen, savedCount: readonly(savedCount), open, close, notifySaved }
}
