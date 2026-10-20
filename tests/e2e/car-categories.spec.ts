import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const OWN_NAME = 'Автозвук'
const RENAMED = 'Мультимедиа'

async function openCategoriesFromSettings(page: Page, carId: number) {
  await page.goto(`/cars/${carId}/settings`)
  await page.getByRole('link', { name: /Категории\s*\d+/ }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}/categories$`))
  await expect(page.getByRole('heading', { name: 'Категории', level: 1 })).toBeVisible()
}

async function addCategory(page: Page, name: string) {
  await page.getByRole('button', { name: 'Добавить категорию' }).click()
  const sheet = page.getByRole('dialog', { name: 'Новая категория' })
  await sheet.getByLabel('Название').fill(name)
  await sheet.getByRole('button', { name: 'Добавить', exact: true }).click()
  return sheet
}

test('З3: стандартные категории — только чтение, с числом записей', async ({ page, seededCar }) => {
  await openCategoriesFromSettings(page, seededCar.carId)

  const standard = page.getByTestId('categories-standard')
  await expect(standard.getByTestId('category-row').filter({ hasText: 'Прочее' })).toContainText(
    /3\sзаписи/,
  )
  await expect(standard.getByTestId('category-row').filter({ hasText: 'Шины' })).toContainText(
    /1\sзапись/,
  )
  await expect(standard.getByRole('button')).toHaveCount(0)

  await expect(page.getByTestId('categories-own-empty')).toContainText('Своих категорий пока нет')
  await snap(page, 'car-categories-empty')
})

test('З3: своя категория добавляется, переименовывается и удаляется', async ({
  page,
  seededCar,
}) => {
  const { carId } = seededCar
  await openCategoriesFromSettings(page, carId)

  // Добавление; имя стандартной категории занято
  const duplicateSheet = await addCategory(page, 'Шины')
  await expect(duplicateSheet.getByText('Такая категория уже есть')).toBeVisible()
  await duplicateSheet.getByLabel('Название').fill(OWN_NAME)
  await duplicateSheet.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(duplicateSheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Категория добавлена' })).toBeVisible()

  const own = page.getByTestId('categories-own')
  const ownRow = own.getByTestId('category-row').filter({ hasText: OWN_NAME })
  await expect(ownRow).toContainText('Нет записей')
  await expect(
    own.getByRole('button', { name: `Переименовать категорию ${OWN_NAME}` }),
  ).toBeVisible()

  // Переименование
  await own.getByRole('button', { name: `Переименовать категорию ${OWN_NAME}` }).click()
  const renameSheet = page.getByRole('dialog', { name: 'Переименовать категорию' })
  await expect(renameSheet.getByLabel('Название')).toHaveValue(OWN_NAME)
  await renameSheet.getByLabel('Название').fill(RENAMED)
  await renameSheet.getByRole('button', { name: 'Сохранить' }).click()
  await expect(renameSheet).toBeHidden()
  await expect(own.getByTestId('category-row').filter({ hasText: RENAMED })).toBeVisible()
  await expect(own.getByTestId('category-row')).toHaveCount(1)
  await snap(page, 'car-categories')

  // Запись в своей категории переедет в «Прочее» при удалении
  const categories = await (await page.request.get(`/api/cars/${carId}/categories`)).json()
  const created = categories.find((category: { name: string }) => category.name === RENAMED)
  const response = await page.request.post(`/api/cars/${carId}/entries`, {
    data: { date: '2026-10-01', type: 'repair', description: 'Покраска', categoryId: created.id },
  })
  expect(response.ok()).toBe(true)
  await page.reload()
  await expect(own.getByTestId('category-row').filter({ hasText: RENAMED })).toContainText(
    /1\sзапись/,
  )

  // Удаление: диалог предупреждает про «Прочее»
  await own.getByRole('button', { name: `Удалить категорию ${RENAMED}` }).click()
  const dialog = page.getByRole('alertdialog', { name: `Удалить «${RENAMED}»?` })
  await expect(dialog).toContainText('Записи перейдут в «Прочее»')
  await snap(page, 'car-categories-delete-dialog')
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Категория удалена' })).toBeVisible()
  await expect(page.getByTestId('categories-own-empty')).toBeVisible()
  await expect(
    page
      .getByTestId('categories-standard')
      .getByTestId('category-row')
      .filter({ hasText: 'Прочее' }),
  ).toContainText(/4\sзаписи/)
})

test('З3: пустое название не сохраняется', async ({ page, seededCar }) => {
  await openCategoriesFromSettings(page, seededCar.carId)
  const sheet = await addCategory(page, '   ')
  await expect(sheet.getByText('Укажите название категории')).toBeVisible()
})
