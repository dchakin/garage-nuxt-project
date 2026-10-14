/** Ключ localStorage: id последней открытой машины (её «Обзор» открывается с `/`). */
export const LAST_CAR_STORAGE_KEY = 'garage:lastCarId'

/**
 * Последняя открытая машина. Пишет `layouts/car.vue` при каждом заходе в машину,
 * читает `pages/index.vue`. Хранилище может быть недоступно (приватный режим) — тогда
 * просто ничего не запоминается.
 */
export function useLastCar() {
  function getLastCarId(): number | null {
    try {
      const stored = Number(localStorage.getItem(LAST_CAR_STORAGE_KEY))
      return Number.isInteger(stored) && stored > 0 ? stored : null
    } catch {
      return null
    }
  }

  function rememberLastCar(carId: number) {
    try {
      localStorage.setItem(LAST_CAR_STORAGE_KEY, String(carId))
    } catch {
      // Хранилище недоступно — после перезагрузки откроется список машин
    }
  }

  function forgetLastCar() {
    try {
      localStorage.removeItem(LAST_CAR_STORAGE_KEY)
    } catch {
      // см. rememberLastCar
    }
  }

  return { getLastCarId, rememberLastCar, forgetLastCar }
}
