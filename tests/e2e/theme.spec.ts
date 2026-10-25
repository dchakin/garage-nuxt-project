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

test('смена темы перекрашивает всё разом, без transition у части элементов (#122)', async ({
  page,
}) => {
  await registerViaApi(page, createTestUser())
  await page.goto('/profile')
  // До наблюдателя: snap() сам переключает класс `dark`
  await snap(page, 'theme-switch-before')
  // У UiButton transition-colors (dur-fast 120ms): через 40ms после смены класса фон был бы
  // промежуточным, если бы transition не выключались на время смены
  const logout = page.getByRole('button', { name: 'Выйти' })
  await logout.evaluate((button) => {
    const sample = window as unknown as { themeSwitchSample?: string }
    new MutationObserver((_, observer) => {
      observer.disconnect()
      setTimeout(() => {
        sample.themeSwitchSample = getComputedStyle(button).backgroundColor
      }, 40)
    }).observe(document.documentElement, { attributeFilter: ['class'] })
  })

  await page
    .getByRole('radiogroup', { name: 'Тема' })
    .getByRole('radio', { name: 'Тёмная' })
    .click()
  const duringSwitch = await page.waitForFunction(
    () => (window as unknown as { themeSwitchSample?: string }).themeSwitchSample,
  )
  await page.waitForTimeout(300)
  const settled = await logout.evaluate((button) => getComputedStyle(button).backgroundColor)
  expect(await duringSwitch.jsonValue()).toBe(settled)
  await snap(page, 'theme-switch-after')
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

test('нижняя область закрашена фоном темы: фон на <html>, viewport-fit=cover (#114)', async ({
  page,
}) => {
  await registerViaApi(page, createTestUser())
  await page.goto('/profile')

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  )
  await expect(html(page)).toHaveCSS('background-color', 'rgb(245, 244, 240)')
  await snap(page, 'profile-bottom-area')

  const themeGroup = page.getByRole('radiogroup', { name: 'Тема' })
  await themeGroup.getByRole('radio', { name: 'Тёмная' }).click()
  await expect(html(page)).toHaveCSS('background-color', 'rgb(15, 15, 14)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 14)')
})
