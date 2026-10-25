import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('масштабирование страницы жестом запрещено (#120)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).toContain('maximum-scale=1')
  expect(viewport).toContain('user-scalable=no')

  await expect(page.locator('html')).toHaveCSS('touch-action', 'manipulation')

  // iOS Safari игнорирует viewport: масштабирование останавливает отмена gesturestart
  const prevented = await page.evaluate(() => {
    const event = new Event('gesturestart', { cancelable: true })
    document.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(prevented).toBe(true)

  await snap(page, 'pinch-zoom-login')
})
