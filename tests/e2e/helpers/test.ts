import { test as base } from '@playwright/test'

/** «Сейчас» во всех e2e — совпадает с эталонными данными макета (design/garage.pen). */
export const FIXED_NOW = '2026-10-10T09:41:00+03:00'

/** `test` с зафиксированным временем страницы: импортировать его вместо `@playwright/test`. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_NOW)
    await use(page)
  },
})

export { expect } from '@playwright/test'
