import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const addEntryButton = (page: Page) =>
  page.getByRole('navigation', { name: 'Разделы машины' }).getByRole('button', {
    name: 'Добавить запись',
  })

const entrySheet = (page: Page) => page.getByRole('dialog', { name: 'Новая запись' })

test('трата с «Обзора» за 4 тапа: тип, название, сумма, сохранить', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}`)
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)

  await addEntryButton(page).click()
  const sheet = entrySheet(page)
  await expect(sheet).toBeVisible()

  // Пробег и дата по умолчанию — текущий пробег машины и сегодня
  await expect(sheet.getByLabel('Пробег')).toHaveValue(/^87\s450$/)
  await expect(sheet.getByLabel('Дата')).toHaveValue('2026-10-10')
  await expect(sheet.getByLabel('Сумма')).toHaveAttribute('placeholder', '0')
  await expect(sheet.getByRole('button', { name: 'Сохранить' })).toBeEnabled()

  await sheet.getByRole('radio', { name: 'Покупка' }).click() // тап 1
  await sheet.getByLabel('Что сделали').fill('Автомойка') // тап 2
  await sheet.getByLabel('Сумма').fill('500') // тап 3
  await snap(page, 'entry-sheet')
  await sheet.getByRole('button', { name: 'Сохранить' }).click() // тап 4

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Запись добавлена')).toBeVisible()
  // «Обзор» перечитан: расходы месяца выросли, запись — в последних
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s700\s₽$/)
  await expect(page.getByRole('listitem').filter({ hasText: 'Автомойка' })).toBeVisible()
})

test('Д3: пробег меньше текущего блокирует сохранение', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}`)
  await addEntryButton(page).click()
  const sheet = entrySheet(page)

  await sheet.getByRole('radio', { name: 'Ремонт' }).click()
  await sheet.getByLabel('Пробег').fill('80000')

  await expect(sheet.getByText(/Похоже на опечатку/)).toBeVisible()
  await expect(sheet.getByLabel('Пробег')).toHaveAttribute('aria-invalid', 'true')
  await expect(sheet.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
  await snap(page, 'entry-sheet-mileage-error')

  // Исправили число — сохранять можно
  await sheet.getByLabel('Пробег').fill('87500')
  await expect(sheet.getByText(/Похоже на опечатку/)).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
})

test('старая дата и пробег не в ряд записей — предупреждение, не блокировка', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}`)
  await addEntryButton(page).click()
  const sheet = entrySheet(page)

  await sheet.getByRole('radio', { name: 'Прочее' }).click()
  await sheet.getByLabel('Дата').fill('2026-01-01')
  await sheet.getByLabel('Пробег').fill('99000')

  await expect(sheet.getByText(/Больше, чем в записи от/)).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
})

test('без типа ошибка у поля, запрос не уходит; серверная ошибка — в плашке', async ({
  page,
  seededCar,
}) => {
  const createRequests: string[] = []
  await page.route('**/api/cars/*/entries', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    createRequests.push(route.request().url())
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 500, statusMessage: 'Сервер недоступен' }),
    })
  })

  await page.goto(`/cars/${seededCar.carId}`)
  await addEntryButton(page).click()
  const sheet = entrySheet(page)

  await sheet.getByRole('button', { name: 'Сохранить' }).click()
  await expect(sheet.getByText('Выберите тип записи')).toBeVisible()
  expect(createRequests).toHaveLength(0)

  await sheet.getByRole('radio', { name: 'Ремонт' }).click()
  await expect(sheet.getByText('Выберите тип записи')).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Сохранить' }).click()
  await expect(sheet.getByRole('alert').filter({ hasText: 'Сервер недоступен' })).toBeVisible()
  await expect(sheet).toBeVisible()
  expect(createRequests).toHaveLength(1)
})

test('подсказки из прошлых записей и свёрнутые категория и место', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await page.getByRole('button', { name: 'Добавить запись' }).first().click()
  const sheet = entrySheet(page)

  const titleField = sheet.getByLabel('Что сделали')
  await titleField.fill('Щётки')
  const suggestion = sheet.getByRole('button', { name: /^Щётки/ })
  await expect(suggestion).toBeVisible()
  await suggestion.click()
  await expect(titleField).toHaveValue(/Щётки/)

  // Категория и место скрыты, пока блок не раскрыт
  await expect(sheet.getByLabel('Место')).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Категория и место' }).click()
  await sheet.getByLabel('Место').fill('Магазин Тест-77')
  await sheet.getByRole('radio', { name: 'Замена' }).click()
  await sheet.getByRole('button', { name: 'Сохранить' }).click()

  await expect(sheet).toBeHidden()
  // Журнал перечитан
  await expect(page.getByText('Магазин Тест-77')).toBeVisible()
})
