import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

test('З4: участник видит данные для чтения, обновляет пробег и покидает машину', async ({
  page,
  seededCar,
}) => {
  const { carIds, users } = seededCar
  await page.goto(`/cars/${carIds.largus}/settings`)
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()

  // Вид участника: данные не редактируются, владелец назван
  await expect(page.getByText(`Данные машины меняет владелец — ${users.olga.name}`)).toBeVisible()
  const info = page.getByTestId('member-car-info')
  await expect(info).toContainText('Lada')
  await expect(info).toContainText('Largus')
  await expect(info).toContainText('2015')
  await expect(info).toContainText('Е777КХ 50')
  await expect(info).toContainText(users.olga.name)
  await expect(page.getByLabel('Марка')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Готово' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Пригласить участника' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Удалить машину' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Категории/ })).toHaveAttribute(
    'href',
    `/cars/${carIds.largus}/categories`,
  )
  await snap(page, 'car-member')

  // Пробег участник обновлять может
  await expect(page.getByRole('button', { name: /Пробег/ })).toContainText(/154\s300\sкм/)
  await page.getByRole('button', { name: /Пробег/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Обновить пробег' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /^\+100\s+км$/ }).click()
  await sheet.getByRole('button', { name: 'Сохранить' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: /Пробег/ })).toContainText(/154\s400\sкм/)

  // Выход: диалог, подтверждение, машина пропала из списка
  await page.getByRole('button', { name: 'Покинуть машину…' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Покинуть Lada Largus?' })
  await expect(dialog).toBeVisible()
  await snap(page, 'car-member-leave-dialog')
  await dialog.getByRole('button', { name: 'Покинуть' }).click()

  await expect(page).toHaveURL(/\/cars$/)
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Toyota Camry/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Lada Largus/ })).toHaveCount(0)

  // Доступ закрыт
  await page.goto(`/cars/${carIds.largus}/settings`)
  await expect(page).toHaveURL(/\/cars$/)
})
