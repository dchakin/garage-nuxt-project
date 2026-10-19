import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const entrySheet = (page: Page) => page.getByRole('dialog', { name: 'Запись', exact: true })
const entryRow = (page: Page, title: string | RegExp) => page.getByRole('button', { name: title })

/** Ждём дольше, чем живёт отложенное удаление (5 с), чтобы убедиться: DELETE не ушёл */
const AFTER_DELETE_DELAY_MS = 6_000

function trackDeleteRequests(page: Page): string[] {
  const urls: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'DELETE' && request.url().includes('/api/entries/')) {
      urls.push(request.url())
    }
  })
  return urls
}

test('Д4: тап по записи открывает шторку, правка сохраняется и видна в журнале', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await entryRow(page, /Щётки стеклоочистителя/).click()

  const sheet = entrySheet(page)
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Что сделали')).toHaveValue('Щётки стеклоочистителя')
  await expect(sheet.getByLabel('Сумма')).toHaveValue(/^1\s200$/)
  await expect(sheet.getByLabel('Дата')).toHaveValue('2026-10-07')
  await expect(sheet.getByLabel('Место')).toHaveValue('Автомагазин')
  await expect(sheet.getByRole('radio', { name: 'Покупка' })).toBeChecked()
  await expect(sheet.getByTestId('entry-author')).toHaveText(/^Добавил .+ · .+/)
  await snap(page, 'entry-detail')

  await sheet.getByLabel('Сумма').fill('1500')
  await sheet.getByRole('button', { name: 'Сохранить изменения' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Изменения сохранены')).toBeVisible()
  await expect(entryRow(page, /Щётки стеклоочистителя/)).toContainText(/1\s500\s₽/)
})

test('удаление и «Отменить»: запись возвращается, DELETE не уходит', async ({
  page,
  seededCar,
}) => {
  const deletes = trackDeleteRequests(page)
  await page.goto(`/cars/${seededCar.carId}`)
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)

  await entryRow(page, /Щётки стеклоочистителя/).click()
  await entrySheet(page).getByRole('button', { name: 'Удалить запись' }).click()

  // Без диалога: запись сразу пропала, сумма месяца пересчитана
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(entrySheet(page)).toBeHidden()
  await expect(page.getByText('Запись удалена')).toBeVisible()
  await expect(entryRow(page, /Щётки стеклоочистителя/)).toHaveCount(0)
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^0\s₽$/)

  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(entryRow(page, /Щётки стеклоочистителя/)).toBeVisible()
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)

  await page.waitForTimeout(AFTER_DELETE_DELAY_MS)
  expect(deletes).toHaveLength(0)
})

test('В7: удаление без «Отменить» доходит до сервера', async ({ page, seededCar }) => {
  const deletes = trackDeleteRequests(page)
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(entryRow(page, /Мойка и химчистка салона/)).toBeVisible()

  await entryRow(page, /Мойка и химчистка салона/).click()
  await entrySheet(page).getByRole('button', { name: 'Удалить запись' }).click()

  await expect(entryRow(page, /Мойка и химчистка салона/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отменить' })).toBeVisible()
  await snap(page, 'journal-entry-deleted')
  expect(deletes).toHaveLength(0)

  const request = await page.waitForRequest(
    (candidate) => candidate.method() === 'DELETE' && candidate.url().includes('/api/entries/'),
  )
  const response = await request.response()
  expect(response?.ok()).toBe(true)

  await page.reload()
  await expect(entryRow(page, /Щётки стеклоочистителя/)).toBeVisible()
  await expect(entryRow(page, /Мойка и химчистка салона/)).toHaveCount(0)
})
