import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const PREV_PERIOD = 'Предыдущий период'
const NEXT_PERIOD = 'Следующий период'
const MIN_BAR_PIXELS = 500

/** Число закрашенных (синих) пикселей canvas: столбцы нарисованы, а не только подписи оси */
function countBarPixels(canvas: HTMLCanvasElement): number {
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  let count = 0
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3]! > 0 && data[i + 2]! > data[i]! + 20) count++
  return count
}

test('Расходы (Ж1): год 2026 совпадает с эталоном', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/expenses`)

  await expect(page.getByRole('heading', { name: 'Расходы', level: 1 })).toBeAttached()
  await expect(page.getByRole('radio', { name: 'Год' })).toBeChecked()
  await expect(page.getByText('2026 год', { exact: true })).toBeVisible()
  // Дальше текущего периода нельзя; раньше 2026 трат нет
  await expect(page.getByRole('button', { name: NEXT_PERIOD })).toBeDisabled()
  await expect(page.getByRole('button', { name: PREV_PERIOD })).toBeDisabled()

  await expect(page.getByTestId('expenses-total')).toHaveText(/^88\s500\s₽$/)
  const metrics = page.getByTestId('expenses-metrics')
  await expect(metrics).toContainText(/Стоимость километра\s*8,6\s₽(?!\/км)/)
  await expect(metrics).toContainText(/Средняя запись\s*11\s060\s₽/)
  await expect(metrics).toContainText(/Больше всего в мае\s*48\s600\s₽/)
  await expect(metrics).not.toContainText('В среднем')
  await expect(page.getByText('Потрачено')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'По месяцам' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'По категориям' })).toBeVisible()

  const categories = page.getByTestId('expenses-categories').getByRole('listitem')
  await expect(categories).toHaveCount(6)
  await expect(categories.first()).toContainText('Шины')
  await expect(categories.first()).toContainText(/55\s%/)
  await expect(categories.first()).toContainText(/48\s600\s₽/)
  await expect(categories.last()).toContainText('Прочее')
  await expect(categories.last()).toContainText(/13\s%/)

  const canvas = page.getByTestId('expenses-chart').locator('canvas')
  await expect.poll(() => canvas.evaluate(countBarPixels)).toBeGreaterThan(MIN_BAR_PIXELS)
  // Ось — месяцы от первой траты (фев) до текущего (окт), без пустых будущих
  const chartMonths = page.getByTestId('expenses-chart').getByRole('listitem')
  await expect(chartMonths).toHaveCount(9)
  await expect(chartMonths.first()).toContainText('фев')
  await expect(chartMonths.last()).toContainText('окт')

  await snap(page, 'expenses')
})

test('Расходы: «Месяц», листание ‹ › и «Всё время»', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/expenses`)
  await expect(page.getByTestId('expenses-total')).toBeVisible()

  await page.getByRole('radio', { name: 'Месяц' }).click()
  await expect(page.getByText('Октябрь 2026', { exact: true })).toBeVisible()
  await expect(page.getByTestId('expenses-total')).toHaveText(/^1\s200\s₽$/)
  await expect(page.getByRole('button', { name: NEXT_PERIOD })).toBeDisabled()
  // В месяце нет «Больше всего»
  await expect(page.getByTestId('expenses-metrics')).not.toContainText('Больше всего')

  await page.getByRole('button', { name: PREV_PERIOD }).click()
  await expect(page.getByText('Сентябрь 2026', { exact: true })).toBeVisible()
  await expect(page.getByTestId('expenses-total')).toHaveText(/^10\s300\s₽$/)
  await expect(page.getByRole('button', { name: NEXT_PERIOD })).toBeEnabled()

  await page.getByRole('button', { name: NEXT_PERIOD }).click()
  await expect(page.getByText('Октябрь 2026', { exact: true })).toBeVisible()
  await expect(page.getByTestId('expenses-total')).toHaveText(/^1\s200\s₽$/)
  await snap(page, 'expenses-month')

  await page.getByRole('radio', { name: 'Всё время' }).click()
  await expect(page.getByRole('button', { name: PREV_PERIOD })).toHaveCount(0)
  await expect(page.getByTestId('expenses-total')).toHaveText(/^88\s500\s₽$/)
  await expect(page.getByRole('heading', { name: 'По годам' })).toBeVisible()
})

test('Расходы (Ж3): месяц без трат и переход «К июню»', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/expenses`)
  await page.getByRole('radio', { name: 'Месяц' }).click()

  // Октябрь → сентябрь → август → июль
  for (const month of ['Сентябрь 2026', 'Август 2026', 'Июль 2026']) {
    await page.getByRole('button', { name: PREV_PERIOD }).click()
    await expect(page.getByText(month, { exact: true })).toBeVisible()
  }

  const empty = page.getByTestId('expenses-empty-period')
  await expect(empty.getByRole('heading', { name: 'В июле трат не было' })).toBeVisible()
  await expect(empty).toContainText(/Ближайшие траты — 7\s500\s₽ в июне и 9\s900\s₽ в августе/)
  // Под переключателем — «0 ₽», графиков и метрик нет, пустое состояние без карточки
  await expect(page.getByTestId('expenses-total')).toHaveText(/^0\s₽$/)
  await expect(page.getByTestId('expenses-metrics')).toHaveCount(0)
  await expect(page.getByTestId('expenses-chart')).toHaveCount(0)
  // Segmented и переключатель остаются: из Ж3 можно листать
  await expect(page.getByRole('radio', { name: 'Месяц' })).toBeChecked()
  await expect(page.getByRole('button', { name: NEXT_PERIOD })).toBeEnabled()
  await snap(page, 'expenses-empty-period')

  await empty.getByRole('button', { name: 'К июню' }).click()
  await expect(page.getByText('Июнь 2026', { exact: true })).toBeVisible()
  await expect(page.getByTestId('expenses-total')).toHaveText(/^7\s500\s₽$/)
  await expect(empty).toHaveCount(0)
})

test('Расходы (Ж2): у машины нет трат — без переключателя периода', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carIds.rio}/expenses`)

  await expect(page.getByRole('heading', { name: 'Расходы', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Пока нечего считать' })).toBeVisible()
  await expect(
    page.getByText(
      'Добавьте записи со стоимостью — здесь появятся итоги, графики и стоимость километра.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Период' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: PREV_PERIOD })).toHaveCount(0)
  await snap(page, 'expenses-empty')

  await page.getByRole('button', { name: 'Добавить запись' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Новая запись' })).toBeVisible()
})
