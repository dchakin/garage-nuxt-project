import { createTestUser, registerViaApi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

// Значения --bg из apps/web/assets/css/tokens.css
const LIGHT_BG = '#f5f4f0'
const DARK_BG = '#0f0f0e'

const html = (page: import('@playwright/test').Page) => page.locator('html')
const themeColor = (page: import('@playwright/test').Page) =>
  page.locator('meta[name="theme-color"]')

test('«Тёмная» переживает перезагрузку и меняет theme-color', async ({ page }) => {
  await registerViaApi(page, createTestUser())
  await page.goto('/profile')

  const themeGroup = page.getByRole('radiogroup', { name: 'Тема' })
  await expect(themeGroup.getByRole('radio', { name: 'Системная' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(html(page)).not.toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', LIGHT_BG)

  await themeGroup.getByRole('radio', { name: 'Тёмная' }).click()
  await expect(html(page)).toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', DARK_BG)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 14)')

  await page.reload()
  await expect(themeGroup.getByRole('radio', { name: 'Тёмная' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(html(page)).toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', DARK_BG)

  await themeGroup.getByRole('radio', { name: 'Светлая' }).click()
  await expect(html(page)).not.toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', LIGHT_BG)
})

test('тема ставится до загрузки бандла — без вспышки', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('garage:theme', 'dark'))

  // Без JS-бандла работает только inline-скрипт в <head>
  await page.route('**/_nuxt/**/*.js', (route) => route.abort())
  await page.reload()
  await expect(html(page)).toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', DARK_BG)
})

test('«Как в системе» следует prefers-color-scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(html(page)).toHaveClass(/dark/)

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).not.toHaveClass(/dark/)
  await expect(themeColor(page)).toHaveAttribute('content', LIGHT_BG)
})

test('экран списка машин в обеих темах', async ({ page }) => {
  await registerViaApi(page, createTestUser())
  await page.goto('/cars')
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await snap(page, 'cars-theme')
})
