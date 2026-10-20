import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const reminderHeadings = (page: Page, title: string) =>
  page.getByRole('article').getByRole('heading', { name: title, exact: true })

async function openSheet(page: Page, carId: number) {
  await page.goto(`/cars/${carId}/reminders`)
  await page.getByRole('button', { name: 'Добавить напоминание' }).click()
  const sheet = page.getByTestId('sheet')
  await expect(sheet).toBeVisible()
  return sheet
}

test('Новое напоминание (Е1): шаблон «Замена масла» → срок от сегодня → создано', async ({
  page,
  seededCar,
}) => {
  const sheet = await openSheet(page, seededCar.carIds.rio)
  await expect(sheet.getByRole('heading', { name: 'Новое напоминание' })).toBeVisible()
  await expect(sheet.getByRole('group', { name: 'Шаблоны' }).getByRole('button')).toHaveCount(6)

  await sheet.getByRole('button', { name: 'Замена масла' }).click()

  // Шаблон: название, интервалы; записей нет — считаем от сегодня и текущего пробега Rio
  await expect(sheet.getByLabel('Название')).toHaveValue('Замена масла')
  await expect(sheet.getByLabel('Каждые', { exact: true })).toHaveValue(/^10\s000$/)
  await expect(sheet.getByLabel('или каждые')).toHaveValue('12')
  await expect(sheet.getByLabel('Категория')).toHaveValue(/\d+/)
  await expect(sheet.getByTestId('reminder-last-hint')).toContainText('оставьте пустым')
  await expect(sheet.getByTestId('reminder-preview')).toContainText(
    /на 52\s100\sкм или 10\sокт\s2027/,
  )
  await expect(sheet.getByText('Срок уже прошёл')).toHaveCount(0)
  await snap(page, 'reminder-sheet-template')

  await sheet.getByRole('button', { name: 'Создать напоминание' }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText('Напоминание создано')).toBeVisible()
  const ok = page.getByTestId('reminder-group-ok')
  await expect(ok.getByRole('heading', { name: 'Замена масла' })).toBeVisible()
})

test('Своё напоминание (Е2): валидация, «Последний раз» вручную и «Срок уже прошёл»', async ({
  page,
  seededCar,
}) => {
  const sheet = await openSheet(page, seededCar.carIds.rio)
  await sheet.getByRole('button', { name: 'Своё' }).click()
  await expect(sheet.getByRole('heading', { name: 'Своё напоминание' })).toBeVisible()
  await expect(sheet.getByLabel('Название')).toHaveValue('')

  // Пустая форма не создаётся
  await sheet.getByRole('button', { name: 'Создать напоминание' }).click()
  await expect(sheet.getByText('Укажите название')).toBeVisible()
  await expect(sheet.getByText(/Укажите, как часто напоминать/)).toBeVisible()
  await expect(sheet).toBeVisible()

  await sheet.getByLabel('Название').fill('Замена тормозной жидкости')
  await sheet.getByLabel('или каждые').fill('24')
  await expect(sheet.getByTestId('reminder-preview')).toContainText(/на 10\sокт\s2028/)

  // Последний раз давно: срок уже позади
  await sheet.getByLabel('Дата').fill('2024-01-10')
  // Год текущий — в подписи даты его нет
  await expect(sheet.getByTestId('reminder-preview')).toContainText(/на 10\sянв(?!\s\d)/)
  await expect(sheet.getByRole('status').filter({ hasText: 'Срок уже прошёл' })).toBeVisible()
  await snap(page, 'reminder-sheet-custom')

  await sheet.getByRole('button', { name: 'Создать напоминание' }).click()

  await expect(sheet).toBeHidden()
  const overdue = page.getByTestId('reminder-group-overdue')
  await expect(overdue.getByRole('heading', { name: 'Замена тормозной жидкости' })).toBeVisible()
})

test('Такое напоминание уже есть (Е3): галочки, «Открыть» и «Всё равно создать ещё одно»', async ({
  page,
  seededCar,
}) => {
  const sheet = await openSheet(page, seededCar.carId)
  // Все шаблоны у Camry уже созданы — отмечены галочкой
  await expect(sheet.locator('[data-created]')).toHaveCount(5)

  await sheet.getByRole('button', { name: 'Замена масла' }).click()

  const duplicate = sheet.getByRole('status').filter({ hasText: 'Замена масла уже есть' })
  await expect(duplicate).toBeVisible()
  await expect(duplicate.getByRole('button', { name: 'Открыть «Замена масла»' })).toBeVisible()
  await expect(sheet.getByLabel('Название')).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: 'Создать напоминание' })).toBeDisabled()
  await snap(page, 'reminder-sheet-duplicate')

  await duplicate.getByRole('button', { name: 'Всё равно создать ещё одно' }).click()

  // «Последний раз» — из последней записи категории «Масло и фильтры» (14 фев, 77 200 км)
  await expect(duplicate).toHaveCount(0)
  await expect(sheet.getByLabel('Пробег')).toHaveValue(/^77\s200$/)
  await expect(sheet.getByLabel('Дата')).toHaveValue('2026-02-14')
  await expect(sheet.getByTestId('reminder-last-hint')).toContainText(
    /Замена масла 5W-30 и фильтра.* от 14\sфев/,
  )
  // 77 200 + 10 000 = 87 200 < текущих 87 450
  await expect(sheet.getByTestId('reminder-preview')).toContainText(/на 87\s200\sкм/)
  await expect(sheet.getByText('Срок уже прошёл')).toBeVisible()

  await sheet.getByRole('button', { name: 'Создать напоминание' }).click()

  await expect(sheet).toBeHidden()
  await expect(reminderHeadings(page, 'Замена масла')).toHaveCount(2)
})

test('Е3: «Открыть «…»» закрывает шторку создания', async ({ page, seededCar }) => {
  const sheet = await openSheet(page, seededCar.carId)
  await sheet.getByRole('button', { name: 'ОСАГО' }).click()

  await sheet.getByRole('button', { name: 'Открыть «ОСАГО»' }).click()

  await expect(sheet).toBeHidden()
  await expect(reminderHeadings(page, 'ОСАГО')).toHaveCount(1)
})
