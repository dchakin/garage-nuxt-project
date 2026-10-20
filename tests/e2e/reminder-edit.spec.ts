import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const editSheet = (page: Page) => page.getByRole('dialog', { name: 'Изменить напоминание' })
const reminderCard = (page: Page, title: string) =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
const remindersTab = (page: Page) =>
  page.getByRole('navigation', { name: 'Разделы машины' }).getByRole('link', {
    name: /^Напоминания/,
  })

/** Ждём дольше, чем живёт отложенное удаление (5 с), чтобы убедиться: DELETE не ушёл */
const AFTER_DELETE_DELAY_MS = 6_000

function trackDeleteRequests(page: Page): string[] {
  const urls: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'DELETE' && request.url().includes('/api/reminders/')) {
      urls.push(request.url())
    }
  })
  return urls
}

async function openEditSheet(page: Page, title: string) {
  await reminderCard(page, title).getByRole('button', { name: title, exact: true }).click()
  await expect(editSheet(page)).toBeVisible()
  return editSheet(page)
}

test('Е4: поля заполнены, «Напоминать» выключает напоминание, бейдж уменьшается', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 3$/)

  const sheet = await openEditSheet(page, 'Замена масла')
  await expect(sheet.getByLabel('Название')).toHaveValue('Замена масла')
  await expect(sheet.getByLabel('Каждые', { exact: true })).toHaveValue(/^10\s000$/)
  await expect(sheet.getByLabel('или каждые')).toHaveValue('12')
  await expect(sheet.getByRole('switch', { name: 'Напоминать' })).toBeChecked()
  await expect(sheet.getByTestId('reminder-preview')).toContainText('Следующий раз')
  await snap(page, 'reminder-edit-sheet')

  await sheet.getByRole('switch', { name: 'Напоминать' }).click()
  await expect(sheet.getByTestId('reminder-preview')).toContainText('Если включить')
  await snap(page, 'reminder-edit-disabled')

  await sheet.getByRole('button', { name: 'Сохранить изменения' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Изменения сохранены')).toBeVisible()
  await expect(
    page.getByTestId('reminder-group-inactive').getByRole('heading', { name: 'Замена масла' }),
  ).toBeVisible()
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 2$/)
})

test('Е4: правка названия и интервала сохраняется', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  const sheet = await openEditSheet(page, 'ОСАГО')
  await sheet.getByLabel('Название').fill('ОСАГО Ингосстрах')
  await sheet.getByLabel('или каждые').fill('6')
  await sheet.getByRole('button', { name: 'Сохранить изменения' }).click()

  await expect(sheet).toBeHidden()
  await expect(reminderCard(page, 'ОСАГО Ингосстрах')).toContainText(/Каждые 6\sмес/)
  await expect(reminderCard(page, 'ОСАГО')).toHaveCount(0)
})

test('Е4: пустое название не сохраняется', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  const sheet = await openEditSheet(page, 'ОСАГО')
  await sheet.getByLabel('Название').fill('')
  await sheet.getByRole('button', { name: 'Сохранить изменения' }).click()

  await expect(sheet.getByText('Укажите название')).toBeVisible()
  await expect(sheet).toBeVisible()
})

test('Е3 → Е4: «Открыть» у дубликата открывает шторку правки', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)
  await page.getByRole('button', { name: 'Добавить напоминание' }).click()
  const createSheet = page.getByRole('dialog', { name: 'Новое напоминание' })
  await createSheet.getByRole('button', { name: 'Замена масла' }).click()
  await createSheet.getByRole('button', { name: 'Открыть «Замена масла»' }).click()

  await expect(createSheet).toBeHidden()
  await expect(editSheet(page)).toBeVisible()
  await expect(editSheet(page).getByLabel('Название')).toHaveValue('Замена масла')
})

test('И3: удаление и «Отменить» — напоминание возвращается, DELETE не уходит', async ({
  page,
  seededCar,
}) => {
  const deletes = trackDeleteRequests(page)
  await page.goto(`/cars/${seededCar.carId}/reminders`)
  await expect(page.getByRole('article')).toHaveCount(5)

  const sheet = await openEditSheet(page, 'ОСАГО')
  await sheet.getByRole('button', { name: 'Удалить напоминание' }).click()

  // Без диалога: напоминание сразу пропало, внизу toast с «Отменить»
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(sheet).toBeHidden()
  await expect(page.getByText('Напоминание удалено')).toBeVisible()
  await expect(reminderCard(page, 'ОСАГО')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(4)
  await snap(page, 'reminder-deleted')

  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(reminderCard(page, 'ОСАГО')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(5)

  await page.waitForTimeout(AFTER_DELETE_DELAY_MS)
  expect(deletes).toHaveLength(0)
})

test('И3: удаление без «Отменить» доходит до сервера', async ({ page, seededCar }) => {
  const deletes = trackDeleteRequests(page)
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  const sheet = await openEditSheet(page, 'ОСАГО')
  await sheet.getByRole('button', { name: 'Удалить напоминание' }).click()
  await expect(reminderCard(page, 'ОСАГО')).toHaveCount(0)
  expect(deletes).toHaveLength(0)

  const request = await page.waitForRequest(
    (candidate) => candidate.method() === 'DELETE' && candidate.url().includes('/api/reminders/'),
  )
  expect((await request.response())?.ok()).toBe(true)

  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(4)
  await expect(reminderCard(page, 'ОСАГО')).toHaveCount(0)
})
