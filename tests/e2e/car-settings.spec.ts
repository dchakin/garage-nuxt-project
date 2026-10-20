import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

async function openSettingsFromSwitcher(page: Page, carId: number) {
  await page.goto(`/cars/${carId}`)
  await page.getByRole('button', { name: /^Сменить машину/ }).click()
  await page.getByRole('link', { name: 'Настройки Toyota Camry' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}/settings$`))
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()
}

test('З2: данные машины, пробег, категории и участники; правка сохраняется', async ({
  page,
  seededCar,
}) => {
  const { carId, users } = seededCar
  await openSettingsFromSwitcher(page, carId)

  await expect(page.getByLabel('Марка')).toHaveValue('Toyota')
  await expect(page.getByLabel('Модель')).toHaveValue('Camry')
  await expect(page.getByLabel('Госномер')).toHaveClass(/font-mono/)
  await expect(page.getByLabel('VIN')).toHaveClass(/font-mono/)
  await expect(page.getByRole('button', { name: /Пробег/ })).toContainText(/87\s450\sкм/)
  await expect(page.getByRole('link', { name: /Категории\s*\d+/ })).toHaveAttribute(
    'href',
    `/cars/${carId}/categories`,
  )

  const members = page.getByTestId('members-list')
  await expect(members).toContainText(`${users.dmitry.name} (вы)`)
  await expect(members).toContainText('Владелец')
  await expect(members).toContainText(users.anna.name)
  await expect(members).toContainText(users.anna.email)
  await expect(members).toContainText('Участник')
  await snap(page, 'car-settings')

  // Обязательные поля
  await page.getByLabel('Модель').fill('')
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByText('Укажите модель')).toBeVisible()
  await expect(page).toHaveURL(/\/settings$/)

  // Правка сохраняется и видна в шапке машины
  await page.getByLabel('Модель').fill('Camry Hybrid')
  await page.getByLabel('Год выпуска').fill('2019')
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}$`))
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Сменить машину: Toyota Camry Hybrid' }),
  ).toBeVisible()
})

test('З2: строка «Пробег» открывает шторку обновления пробега', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/settings`)
  await page.getByRole('button', { name: /Пробег/ }).click()

  const sheet = page.getByRole('dialog', { name: 'Обновить пробег' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /^\+100\s+км$/ }).click()
  await sheet.getByRole('button', { name: 'Сохранить' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: /Пробег/ })).toContainText(/87\s550\sкм/)
})

test('И2: диалог удаления перечисляет записи, напоминания и участников; машина удаляется', async ({
  page,
  seededCar,
}) => {
  const { carId, users } = seededCar
  await page.goto(`/cars/${carId}/settings`)
  await page.getByRole('button', { name: 'Удалить машину' }).click()

  const dialog = page.getByRole('alertdialog', { name: 'Удалить Toyota Camry?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('8 записей и 5 напоминаний')
  await expect(dialog).toContainText(`${users.anna.name} потеряет доступ`)
  await snap(page, 'car-delete-dialog')

  // Отмена ничего не удаляет
  await dialog.getByRole('button', { name: 'Отмена' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Удалить машину' }).click()
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click()

  await expect(page).toHaveURL(/\/cars$/)
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Toyota Camry/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Kia Rio/ })).toBeVisible()
})
