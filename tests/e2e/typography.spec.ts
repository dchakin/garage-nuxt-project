import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

/** Все запросы шрифтов страницы — чтобы проверить, что они идут на свой origin, а не на CDN. */
function collectFontRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') urls.push(request.url())
  })
  return urls
}

const isFontLoaded = (page: Page, font: string) =>
  page.evaluate(async (font) => {
    await document.fonts.load(font, 'Гараж A123')
    return document.fonts.check(font, 'Гараж A123')
  }, font)

test('шрифты Onest и JetBrains Mono грузятся из бандла', async ({ page, seededCar, baseURL }) => {
  const fontUrls = collectFontRequests(page)
  await page.goto(`/cars/${seededCar.carId}`)
  await expect(page.getByRole('button', { name: 'Сменить машину: Toyota Camry' })).toBeVisible()

  expect(await isFontLoaded(page, '16px "Onest Variable"')).toBe(true)
  expect(await isFontLoaded(page, '600 16px "JetBrains Mono"')).toBe(true)

  const body = page.locator('body')
  await expect(body).toHaveCSS('font-family', /^"Onest Variable"/)
  await expect(body).toHaveCSS('font-variant-numeric', 'tabular-nums')
  await expect(page.getByRole('img', { name: /^Госномер/ }).first()).toHaveCSS(
    'font-family',
    /^"JetBrains Mono"/,
  )

  expect(fontUrls.length).toBeGreaterThan(0)
  const origin = new URL(baseURL!).origin
  for (const url of fontUrls) expect(new URL(url).origin).toBe(origin)
})

test('иконки Lucide вместо эмодзи на основных экранах', async ({ page, seededCar }) => {
  await page.goto('/cars')
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Добавить авто' }).locator('svg.lucide'),
  ).toBeVisible()
  await snap(page, 'icons-cars')

  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(page.getByRole('heading', { name: 'Журнал' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Журнал' }).locator('svg.lucide-notebook-text'),
  ).toBeVisible()
  // Плитка типа записи: «Плановое ТО» — calendar-check
  await expect(page.locator('svg.lucide-calendar-check').first()).toBeVisible()
  await snap(page, 'icons-journal')

  await page.getByRole('link', { name: /^Напоминания/ }).click()
  await expect(page.getByRole('heading', { name: 'Напоминания' })).toBeVisible()
  await snap(page, 'icons-reminders')
})

test('иконки на входе и показ пароля', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('header img[src="/logo.svg"]')).toBeVisible()
  const toggle = page.getByRole('button', { name: 'Показать пароль' })
  await expect(toggle.locator('svg.lucide-eye')).toBeVisible()
  await toggle.click()
  await expect(
    page.getByRole('button', { name: 'Скрыть пароль' }).locator('svg.lucide-eye-off'),
  ).toBeVisible()
  await snap(page, 'icons-login')
})
