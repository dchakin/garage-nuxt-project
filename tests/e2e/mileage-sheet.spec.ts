import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const sheetOf = (page: Page) => page.getByRole('dialog', { name: 'Обновить пробег' })
const remindersTab = (page: Page) =>
  page.getByRole('navigation', { name: 'Разделы машины' }).getByRole('link', {
    name: /^Напоминания/,
  })

async function openMileageSheet(page: Page, carId: number) {
  await page.goto(`/cars/${carId}`)
  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expect(sheetOf(page)).toBeVisible()
  return sheetOf(page)
}

test('Б5–Б6: кнопки прибавляют к «Было», блок «Изменится», пробег обновляется без записи', async ({
  page,
  seededCar,
}) => {
  const sheet = await openMileageSheet(page, seededCar.carId)
  const field = sheet.getByLabel('Сейчас на одометре')

  await expect(field).toHaveValue(/^87\s450$/)
  await expect(sheet.getByTestId('mileage-was')).toContainText(/Было 87\s450\sкм/)
  await expect(sheet.getByTestId('mileage-was')).toContainText('обновлено 3 дня назад')
  // Пока пробег не менялся — блока и активной кнопки нет
  await expect(sheet.getByTestId('mileage-impact')).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: 'Сохранить пробег', exact: true })).toBeDisabled()

  await sheet.getByRole('button', { name: /^\+500\s+км$/ }).click()
  await expect(field).toHaveValue(/^87\s950$/)
  // Второе нажатие прибавляет к «Было», а не к введённому: 87 450 + 100, не 87 950 + 100
  await sheet.getByRole('button', { name: /^\+100\s+км$/ }).click()
  await expect(field).toHaveValue(/^87\s550$/)
  await sheet.getByRole('button', { name: /^\+500\s+км$/ }).click()

  const impact = sheet.getByTestId('mileage-impact')
  await expect(impact).toContainText('Изменится 1 напоминание')
  await expect(impact).toContainText(/Замена масла: просрочено уже на 750\sкм, а не на 250\sкм/)
  await expect(impact).toContainText('Новых push не будет')
  await expect(impact).not.toContainText('Замена ГРМ')
  await snap(page, 'mileage-sheet')

  await sheet.getByRole('button', { name: 'Сохранить пробег', exact: true }).click()

  await expect(sheet).toBeHidden()
  const toast = page.getByRole('status').filter({ hasText: 'Пробег обновлён' })
  await expect(toast).toContainText(/87\s950\sкм/)
  await expect(page.getByTestId('overview-mileage')).toHaveText(/87\s950\s+км/)
  await expect(page.getByText('обновлён только что')).toBeVisible()
  // Запись не создаётся: последняя по-прежнему щётки
  const recent = page.locator('section', {
    has: page.getByRole('heading', { name: 'Последние записи' }),
  })
  await expect(recent.getByRole('listitem').first()).toContainText('Щётки стеклоочистителя')
  await toast.dispatchEvent('pointerdown')
  await snap(page, 'mileage-updated')
})

test('Б5: переход напоминания в «скоро» обещает push', async ({ page, seededCar }) => {
  const sheet = await openMileageSheet(page, seededCar.carId)

  // До «Замены ГРМ» (100 000 км) остаётся 9 500 км — это «скоро» (порог 10% интервала)
  await sheet.getByLabel('Сейчас на одометре').fill('90500')

  const impact = sheet.getByTestId('mileage-impact')
  await expect(impact).toContainText('Изменится 2 напоминания')
  await expect(impact).toContainText(/Замена ГРМ: через 9\s500\sкм/)
  await expect(impact).toContainText('Пришлём push')
  await expect(impact).not.toContainText('Новых push не будет')
})

test('Б7: пробег меньше прежнего — ошибка, «Вернуть» и «Исправить» с подтверждением', async ({
  page,
  seededCar,
}) => {
  const sheet = await openMileageSheet(page, seededCar.carId)
  const field = sheet.getByLabel('Сейчас на одометре')
  const errorAlert = sheet.locator('[data-variant="error"]')
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 3$/)

  await field.fill('78450')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(errorAlert).toContainText(/Меньше прежнего на 9\s000\sкм/)
  // Текста ошибки под полем нет — она только в Alert
  await expect(errorAlert).toHaveCount(1)
  await expect(sheet.getByTestId('mileage-impact')).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: /^Исправить на 78\s450\sкм$/ })).toBeEnabled()
  await snap(page, 'mileage-decrease')

  // «Вернуть» возвращает прежнее значение, ошибка пропадает
  await sheet.getByRole('button', { name: /^Вернуть 87\s450$/ }).click()
  await expect(field).toHaveValue(/^87\s450$/)
  await expect(errorAlert).toHaveCount(0)
  await expect(field).not.toHaveAttribute('aria-invalid', 'true')

  await field.fill('78450')
  await sheet.getByRole('button', { name: /^Исправить на 78\s450\sкм$/ }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByTestId('overview-mileage')).toHaveText(/78\s450\s+км/)
  // Масло больше не просрочено: бейдж 3 → 2
  await expect(remindersTab(page)).toHaveAccessibleName(/требуют внимания: 2$/)
})
