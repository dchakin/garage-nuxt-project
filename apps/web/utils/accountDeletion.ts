import type { Car } from '@garage/shared/types'

export type AccountCar = Pick<Car, 'id' | 'brand' | 'model' | 'ownerId'>

export interface AccountDeletionCars {
  /** Машины пользователя: удалятся вместе с аккаунтом */
  owned: AccountCar[]
  /** Чужие машины: пользователь из них просто выйдет */
  shared: AccountCar[]
}

/** Делит машины для диалога «Удалить аккаунт» (И10) на свои и чужие. */
export function splitCarsForDeletion(cars: AccountCar[], userId: number): AccountDeletionCars {
  return {
    owned: cars.filter((car) => car.ownerId === userId),
    shared: cars.filter((car) => car.ownerId !== userId),
  }
}

/** «Toyota Camry» — подпись машины в списках диалога. */
export function formatCarTitle(car: Pick<Car, 'brand' | 'model'>): string {
  return `${car.brand} ${car.model}`
}
