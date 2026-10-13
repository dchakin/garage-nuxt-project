import { expect, test } from './helpers/test'
import type { Locator } from '@playwright/test'
import { snap } from './helpers/snap'

/** Пиксели canvas, где синий заметно преобладает: столбцы (chart-bar / chart-bar-muted), не подписи */
function countBarPixels(canvas: HTMLCanvasElement): number {
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  let count = 0
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 0 && data[i + 2] > data[i] + 20) count++
  return count
}

/** Снимок canvas после окончания анимации chart.js: два кадра подряд совпали */
async function settledScreenshot(locator: Locator): Promise<Buffer> {
  let previous: Buffer = Buffer.alloc(0)
  await expect
    .poll(async () => {
      const current = await locator.screenshot()
      const settled = current.equals(previous)
      previous = current
      return settled
    })
    .toBe(true)
  return previous
}

test('UI-кит: действия и ввод', async ({ page }) => {
  await page.goto('/dev/ui?group=actions')
  await expect(page.getByRole('heading', { name: 'Действия и ввод' })).toBeVisible()

  // Кнопки: высота control-h, disabled и loading недоступны
  await expect(page.getByRole('button', { name: 'Добавить запись' })).toHaveCSS('height', '52px')
  await expect(page.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Назад' })).toHaveCSS('height', '44px')

  // Поле с ошибкой связано с текстом ошибки
  const wrongMileage = page.getByRole('textbox', { name: 'Пробег' }).nth(1)
  await expect(wrongMileage).toHaveAttribute('aria-invalid', 'true')
  await expect(wrongMileage).toHaveAccessibleDescription(/Меньше текущего/)

  // Сумма: разряды без фокуса
  const amountField = page.getByRole('textbox', { name: 'Сумма' })
  await expect(amountField).toHaveValue('6 800')
  // Разряды и при вводе: дописали нули — пробел переехал, Backspace по нему стирает цифру
  await amountField.click()
  await amountField.press('End')
  await amountField.pressSequentially('00')
  await expect(amountField).toHaveValue('680 000')
  await amountField.press('ArrowLeft')
  await amountField.press('ArrowLeft')
  await amountField.press('ArrowLeft')
  await amountField.press('Backspace')
  await expect(amountField).toHaveValue('68 000')
  await amountField.fill('6800')
  await expect(amountField).toHaveValue('6 800')

  // Сегменты и переключатель
  await page.getByRole('radio', { name: 'Год' }).click()
  await expect(page.getByRole('radio', { name: 'Год' })).toHaveAttribute('aria-checked', 'true')
  const push = page.getByRole('switch', { name: 'Напоминание', exact: true })
  await push.click()
  await expect(push).toHaveAttribute('aria-checked', 'true')

  // Чип фильтра: выбор одного снимает «Все»
  await page.getByRole('button', { name: 'Ремонт' }).click()
  await expect(page.getByRole('button', { name: 'Ремонт' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Все', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  // Вернуть состояние макета перед скриншотом
  await page.getByRole('radio', { name: 'Месяц' }).click()
  await page.getByRole('button', { name: 'Все', exact: true }).click()
  await snap(page, 'ui-actions')
})

test('UI-кит: данные и статусы', async ({ page }) => {
  await page.goto('/dev/ui?group=data')
  await expect(page.getByRole('heading', { name: 'Данные и статусы' })).toBeVisible()

  // Бейджи статусов: иконка + слово
  for (const label of ['Просрочено', 'Скоро', 'В порядке', 'Выключено']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }

  // Карточки напоминаний: эталонные остатки, «Сделал» — только у просроченных и «скоро»
  const oil = page.getByRole('article').filter({ hasText: 'Замена масла' })
  await expect(oil).toContainText('Просрочено на 250 км')
  await expect(oil).toContainText('Срок был 87 200 км')
  await expect(page.getByRole('article').filter({ hasText: 'ОСАГО' })).toContainText('Через 8 дней')
  await expect(page.getByRole('button', { name: 'Сделал' })).toHaveCount(2)

  // Тап по карточке открывает напоминание, «Сделал» — отдельное действие
  const event = page.getByTestId('reminder-event')
  await page
    .getByRole('article')
    .filter({ hasText: 'Замена ГРМ' })
    .click({ position: { x: 8, y: 60 } })
  await expect(event).toHaveText('open: Замена ГРМ')
  await oil.getByRole('button', { name: 'Сделал' }).click()
  await expect(event).toHaveText('done: Замена масла')

  // Переключатель строки
  const toggle = page.getByRole('switch', { name: 'Замена масла' })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  await page
    .getByRole('article')
    .first()
    .click({ position: { x: 8, y: 8 } })
  await expect(event).toHaveText('open: Замена масла')
  await snap(page, 'ui-data')
})

test('UI-кит: графики и загрузка', async ({ page }) => {
  await page.goto('/dev/ui?group=charts')
  await expect(page.getByRole('heading', { name: 'Графики и загрузка' })).toBeVisible()

  // Переключатель периода: вперёд дальше текущего года нельзя
  const prev = page.getByRole('button', { name: 'Предыдущий период' })
  const next = page.getByRole('button', { name: 'Следующий период' })
  await expect(page.getByText('2026 год')).toBeVisible()
  await expect(next).toBeDisabled()
  await prev.click()
  await expect(page.getByText('2025 год')).toBeVisible()
  await next.click()
  await expect(page.getByText('2026 год')).toBeVisible()
  await expect(next).toBeDisabled()

  // Графики нарисованы на canvas; суммы для скринридера — текстом
  await expect(page.locator('canvas')).toHaveCount(2)
  await expect(page.locator('figcaption').first()).toContainText('май: 48 600 ₽')
  // Столбцы реально нарисованы: на canvas есть пиксели цвета столбцов (синие), а не только подписи
  for (const canvas of await page.locator('canvas').all())
    await expect.poll(() => canvas.evaluate(countBarPixels)).toBeGreaterThan(500)

  // Цвет акцентного столбца — из токенов темы: в тёмной теме canvas перерисован другим цветом
  const chart = page.locator('canvas').first()
  const lightPixels = await settledScreenshot(chart)
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  expect((await settledScreenshot(chart)).equals(lightPixels)).toBe(false)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))

  // Категории: длина полосы = доля
  await expect(page.getByTestId('category-bar-fill').first()).toHaveAttribute('style', /width: 55%/)
  await expect(page.locator('[data-skeleton="row"]')).toHaveCount(3)

  await snap(page, 'ui-charts')
})
