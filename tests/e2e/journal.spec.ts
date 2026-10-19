import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const ENTRIES_URL = '**/api/cars/*/entries*'
const SLOW_RESPONSE_MS = 1_500
const CAMRY_ENTRIES_COUNT = 8
const CAMRY_MONTHS = [
  'Октябрь 2026',
  'Сентябрь 2026',
  'Август 2026',
  'Июнь 2026',
  'Май 2026',
  'Март 2026',
  'Февраль 2026',
]

/** Строки записей, сгруппированных по месяцам */
const groupedRows = (page: import('@playwright/test').Page) => page.locator('[data-month] li')

test('Журнал (В1): записи по месяцам с суммами, строка из двух линий', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)

  await expect(page.getByRole('heading', { name: 'Журнал', level: 1 })).toBeAttached()
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  const monthHeadings = page.locator('[data-month] h3')
  await expect(monthHeadings).toHaveText(CAMRY_MONTHS)

  // Сентябрь: 3 500 + 6 800 = 10 300 ₽
  const september = page.locator('[data-month="2026-09"]')
  await expect(september.getByRole('heading', { name: 'Сентябрь 2026' })).toBeVisible()
  await expect(september).toContainText(/10\s300\s₽/)
  await expect(september.getByRole('listitem')).toHaveCount(2)

  // Первая строка: название + сумма, ниже дата · пробег · место
  const latest = groupedRows(page).first()
  await expect(latest).toContainText('Щётки стеклоочистителя')
  await expect(latest).toContainText(/1\s200\s₽/)
  await expect(latest).toContainText(/7\sокт\s·\s87\s450\sкм\s·\sАвтомагазин/)

  await snap(page, 'journal')
})

test('Журнал (В2): фильтр «Ремонт» оставляет две записи', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('button', { name: 'Ремонт', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Ремонт', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(groupedRows(page)).toHaveCount(2)
  await expect(page.locator('[data-month] h3')).toHaveText(['Август 2026', 'Июнь 2026'])
  await expect(groupedRows(page).first()).toContainText('Не заводился — заменили аккумулятор')
  await snap(page, 'journal-filter-repair')

  await page.getByRole('button', { name: 'Все', exact: true }).click()
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
})

test('Журнал: поиск по описанию и месту', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('searchbox', { name: 'Поиск по описанию и месту' }).fill('сервис на ленина')

  // Три записи в «Сервис на Ленина»
  await expect(groupedRows(page)).toHaveCount(3)
})

test('Журнал (В3): ничего не найдено и «Сбросить»', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('searchbox', { name: 'Поиск по описанию и месту' }).fill('вертолёт')

  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible()
  await expect(groupedRows(page)).toHaveCount(0)
  // Поиск остаётся на месте, чтобы его исправить
  await expect(page.getByRole('searchbox', { name: 'Поиск по описанию и месту' })).toHaveValue(
    'вертолёт',
  )
  await snap(page, 'journal-not-found')

  await page.getByRole('button', { name: 'Сбросить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toHaveCount(0)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  await expect(page.getByRole('searchbox', { name: 'Поиск по описанию и месту' })).toHaveValue('')
})

test('Журнал: по пробегу — без групп по месяцам', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('radio', { name: 'По пробегу' }).click()

  await expect(page.locator('[data-month]')).toHaveCount(0)
  const rows = page.getByRole('main').getByRole('listitem')
  await expect(rows).toHaveCount(CAMRY_ENTRIES_COUNT)
  await expect(rows.first()).toContainText('Щётки стеклоочистителя')
  await expect(rows.last()).toContainText('Замена масла 5W-30 и фильтра')
})

test('Журнал: тап по строке открывает шторку записи', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)

  await groupedRows(page).first().getByRole('button').click()

  await expect(page.getByRole('dialog', { name: 'Запись', exact: true })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/cars/${seededCar.carId}/journal$`))
})

test('Журнал: старый адрес /entries ведёт на журнал', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/entries`)

  await expect(page).toHaveURL(new RegExp(`/cars/${seededCar.carId}/journal$`))
})

test('Журнал (В4): у машины без записей — пусто', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carIds.rio}/journal`)

  await expect(page.getByRole('heading', { name: 'Записей пока нет' })).toBeVisible()
  await expect(page.getByTestId('journal-filters')).toHaveCount(0)
  await snap(page, 'journal-empty')
})

test('Журнал (В5): скелетон, пока записи грузятся', async ({ page, seededCar }) => {
  await page.route(ENTRIES_URL, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
    await route.continue()
  })
  await page.goto(`/cars/${seededCar.carId}/journal`)

  await expect(page.locator('[data-skeleton="row"]')).toHaveCount(6)
  await expect(groupedRows(page)).toHaveCount(0)
  await snap(page, 'journal-loading')

  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT, { timeout: 10_000 })
  await expect(page.locator('[data-skeleton]')).toHaveCount(0)
})

test('Журнал (В6): ошибка загрузки и «Повторить»', async ({ page, seededCar }) => {
  await page.route(ENTRIES_URL, (route) => route.abort())
  await page.goto(`/cars/${seededCar.carId}/journal`)

  await expect(page.getByRole('heading', { name: 'Не удалось загрузить журнал' })).toBeVisible()
  await snap(page, 'journal-error')

  await page.unroute(ENTRIES_URL)
  await page.getByRole('button', { name: 'Повторить' }).click()

  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить журнал' })).toHaveCount(0)
})
