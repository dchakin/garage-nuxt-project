import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Разделы машины' })

/** Жест «назад»: страница под шторкой остаётся, шторка закрывается */
async function expectBackClosesOverlay(page: Page, overlay: Locator) {
  const url = page.url()
  await expect(overlay).toBeVisible()
  await page.goBack()
  await expect(overlay).toBeHidden()
  expect(page.url()).toBe(url)
}

test('«назад» закрывает шторку записи, а не уводит со страницы', async ({ page, seededCar }) => {
  const { camry } = seededCar.carIds
  await page.goto(`/cars/${camry}`)
  await tabBar(page).getByRole('link', { name: 'Журнал' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/journal$`))

  await tabBar(page).getByRole('button', { name: 'Добавить запись' }).click()
  const sheet = page.getByRole('dialog', { name: 'Новая запись' })
  await expectBackClosesOverlay(page, sheet)
  await expect(page.getByRole('heading', { name: 'Журнал', level: 1 })).toBeVisible()
  await snap(page, 'overlay-back-entry-sheet-closed')

  // Следующее «назад» — уже обычный переход на «Обзор»
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
})

test('«назад» закрывает шторку просмотра записи', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await page.getByRole('button', { name: /Щётки стеклоочистителя/ }).click()
  await expectBackClosesOverlay(page, page.getByRole('dialog', { name: 'Запись', exact: true }))
})

test('«назад» закрывает шторку пробега и переключатель машин', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}`)

  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expectBackClosesOverlay(page, page.getByRole('dialog', { name: 'Обновить пробег' }))

  await page.getByRole('button', { name: /^Сменить машину/ }).click()
  await expectBackClosesOverlay(page, page.getByRole('dialog', { name: 'Мои машины' }))
})

test('шторка, закрытая кнопкой, не оставляет в истории лишней записи', async ({
  page,
  seededCar,
}) => {
  const { camry } = seededCar.carIds
  await page.goto(`/cars/${camry}`)
  await tabBar(page).getByRole('link', { name: 'Журнал' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/journal$`))

  await tabBar(page).getByRole('button', { name: 'Добавить запись' }).click()
  const sheet = page.getByRole('dialog', { name: 'Новая запись' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Закрыть' }).click()
  await expect(sheet).toBeHidden()

  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
})

test('переход из открытого переключателя и смена машины не ломают историю', async ({
  page,
  seededCar,
}) => {
  const { camry, rio } = seededCar.carIds
  await page.goto(`/cars/${camry}`)

  await page.getByRole('button', { name: /^Сменить машину/ }).click()
  const switcher = page.getByRole('dialog', { name: 'Мои машины' })
  await switcher.getByRole('button', { name: /Kia Rio/ }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${rio}$`))
  await expect(switcher).toBeHidden()

  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
  await expect(page.getByRole('button', { name: 'Сменить машину: Toyota Camry' })).toBeVisible()

  await page.getByRole('button', { name: /^Сменить машину/ }).click()
  await switcher.getByRole('link', { name: 'Настройки Toyota Camry' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/settings$`))
  await expect(switcher).toBeHidden()

  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
  await expect(switcher).toBeHidden()
})

test('«назад» закрывает диалог подтверждения', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/settings`)
  await page.getByRole('button', { name: 'Удалить машину' }).click()
  await expectBackClosesOverlay(page, page.getByRole('alertdialog'))
  await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible()
  await snap(page, 'overlay-back-dialog-closed')
})
