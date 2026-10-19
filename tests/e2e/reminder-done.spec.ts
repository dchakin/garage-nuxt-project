import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const reminderCard = (page: Page, title: string) =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) })

const remindersTab = (page: Page) =>
  page.getByRole('navigation', { name: 'Разделы машины' }).getByRole('link', {
    name: /^Напоминания/,
  })

test('«Сделал» на «Замена масла»: запись создана, срок сдвинут, бейдж 3 → 2 (Д2)', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 3$/)

  await reminderCard(page, 'Замена масла').getByRole('button', { name: 'Сделал' }).click()

  const sheet = page.getByRole('dialog', { name: 'Запись: Замена масла' })
  await expect(sheet).toBeVisible()
  // Тип, название и «мостик» подставлены; следующий срок виден до сохранения
  await expect(sheet.getByText('Закрыть «Замена масла»')).toBeVisible()
  await expect(sheet.getByText(/Следующая — на 97\s450\sкм или 10\sокт\s2027/)).toBeVisible()
  await expect(sheet.getByLabel('Что сделали')).toHaveValue('Замена масла')
  await expect(sheet.getByRole('radio', { name: 'ТО' })).toBeChecked()
  await expect(sheet.getByLabel('Пробег')).toHaveValue(/^87\s450$/)
  await sheet.getByLabel('Сумма').fill('7200')
  await snap(page, 'reminder-done-sheet')

  await sheet.getByRole('button', { name: 'Сохранить' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText(/Срок сдвинут: следующая замена на 97\s450\sкм/)).toBeVisible()
  // Бейдж пересчитан, «Замена масла» ушла из просроченных
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 2$/)
  const overdue = page.getByTestId('reminder-group-overdue')
  await expect(overdue.getByRole('heading', { name: '1 просрочено' })).toBeVisible()
  await expect(overdue.getByRole('heading', { name: 'Замена масла' })).toHaveCount(0)
  await expect(
    page.getByTestId('reminder-group-ok').getByRole('heading', { name: 'Замена масла' }),
  ).toBeVisible()
  await snap(page, 'reminder-done-result')

  // Запись создана
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Замена масла' }).first(),
  ).toContainText(/7\s200\s₽/)
})

test('«Сделал» на Обзоре; выключенный «мостик» — просто запись, срок не двигается', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}`)
  await reminderCard(page, 'Замена масла').getByRole('button', { name: 'Сделал' }).click()

  const sheet = page.getByRole('dialog', { name: 'Запись: Замена масла' })
  await sheet.getByRole('switch', { name: 'Закрыть «Замена масла»' }).click()
  await sheet.getByRole('button', { name: 'Сохранить' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Запись добавлена')).toBeVisible()
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 3$/)
})
