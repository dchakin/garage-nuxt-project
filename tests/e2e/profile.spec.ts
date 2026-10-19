import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

test('профиль: тема, список машин, выход', async ({ page, seededCar }) => {
  const { users } = seededCar

  // Вход в профиль — аватар в шапке машины
  await page.goto(`/cars/${seededCar.carId}`)
  await page.getByRole('link', { name: 'Профиль' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: 'Профиль', level: 1 })).toBeVisible()
  await expect(page.getByText(users.dmitry.email)).toBeVisible()

  // Push без VAPID: переключатель недоступен, причина названа
  const pushToggle = page.getByRole('switch', { name: 'Push-уведомления' })
  await expect(pushToggle).toBeDisabled()
  await expect(page.getByText('Уведомления не настроены на сервере')).toBeVisible()
  await expect(page.getByRole('link', { name: /Мои машины.*3/ })).toBeVisible()
  await snap(page, 'profile')

  // Тема
  const themeGroup = page.getByRole('radiogroup', { name: 'Тема' })
  await themeGroup.getByRole('radio', { name: 'Тёмная' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await themeGroup.getByRole('radio', { name: 'Как в системе' }).click()

  // Назад — к последней машине
  await expect(page.getByRole('link', { name: 'Назад' })).toHaveAttribute(
    'href',
    `/cars/${seededCar.carId}`,
  )

  // Список машин
  await page.getByRole('link', { name: /Мои машины/ }).click()
  await expect(page).toHaveURL(/\/cars$/)
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await expect(page.getByRole('switch')).toHaveCount(0)
  await expect(page.getByRole('radiogroup', { name: 'Тема' })).toHaveCount(0)
  const camryRow = page.getByRole('button', { name: /Toyota Camry/ })
  await expect(camryRow).toContainText('2 просрочено')
  await snap(page, 'cars-list')

  await camryRow.click()
  await expect(page).toHaveURL(new RegExp(`/cars/${seededCar.carId}$`))

  // Выход
  await page.getByRole('link', { name: 'Профиль' }).click()
  await page.getByRole('button', { name: 'Выйти' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login$/)
})
