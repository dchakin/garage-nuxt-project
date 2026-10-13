import { createTestUser, loginViaUi, logout, registerViaUi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('регистрация → вход → список машин', async ({ page }) => {
  const user = createTestUser()

  await registerViaUi(page, user)
  await logout(page)

  await page.goto('/cars')
  await expect(page).toHaveURL(/\/login$/)
  await snap(page, 'login')

  await loginViaUi(page, user)
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await expect(page.getByText('Пока нет ни одного автомобиля')).toBeVisible()
  await snap(page, 'cars-empty')
})
