import { loginViaApi } from '../helpers/auth'
import { test as base } from '../helpers/test'
import { seedReferenceData, type SeededReferenceData } from './seed'

export interface SeededCar extends SeededReferenceData {
  /** Toyota Camry — машина, которую показывают экраны макета. */
  carId: number
}

/**
 * `test` с эталонными данными макета: перед тестом БД заполняется заново (seed.ts),
 * а `page` уже залогинена Дмитрием (cookie-сессия). Время зафиксировано, как в helpers/test.ts.
 */
export const test = base.extend<{ seededCar: SeededCar }>({
  seededCar: async ({ page }, use) => {
    const seeded = await seedReferenceData()
    await loginViaApi(page, seeded.users.dmitry)
    await use({ ...seeded, carId: seeded.carIds.camry })
  },
})

export { expect } from '../helpers/test'
