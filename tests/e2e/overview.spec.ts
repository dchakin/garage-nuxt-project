import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const ANALYTICS_URL = '**/api/cars/*/analytics*'
const SLOW_RESPONSE_MS = 1_500

test('Обзор (Б1): цифры совпадают с макетом', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}`)

  await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeAttached()

  // Пробег и «обновлён N дней назад»
  const mileage = page.getByTestId('overview-mileage')
  await expect(mileage).toHaveText(/87\s450\s+км/)
  await expect(page.getByText('обновлён 3 дня назад')).toBeVisible()
  // Кнопка «Обновить» появится в этапе 8
  await expect(page.getByRole('button', { name: 'Обновить' })).toHaveCount(0)

  // Требует внимания: 2 просрочено + 1 скоро, «Все сроки» → напоминания
  const attention = page.locator('section', {
    has: page.getByRole('heading', { name: 'Требует внимания' }),
  })
  await expect(attention.getByRole('article')).toHaveCount(3)
  for (const title of ['Замена масла', 'Техосмотр', 'ОСАГО']) {
    await expect(attention.getByRole('heading', { name: title })).toBeVisible()
  }
  await expect(attention.getByText(/Срок был 87\s200\sкм/)).toBeVisible()
  await expect(attention.getByRole('button', { name: 'Сделал' })).toHaveCount(3)
  await expect(attention.getByRole('link', { name: 'Все сроки' })).toHaveAttribute(
    'href',
    `/cars/${seededCar.carId}/reminders`,
  )

  // Расходы месяца
  await expect(page.getByRole('heading', { name: 'Расходы в октябре' })).toBeVisible()
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)
  await expect(page.getByText(/в среднем 9\s800\s₽ в месяц/)).toBeVisible()
  await expect(page.getByTestId('mini-bar')).toHaveCount(7)

  // Последние записи: три свежие, ссылка в журнал
  const recent = page.locator('section', {
    has: page.getByRole('heading', { name: 'Последние записи' }),
  })
  await expect(recent.getByRole('listitem')).toHaveCount(3)
  await expect(recent.getByRole('listitem').first()).toContainText('Щётки стеклоочистителя')
  await expect(recent.getByRole('listitem').first()).toContainText('7 окт')
  await expect(recent.getByRole('link', { name: 'Журнал' })).toHaveAttribute(
    'href',
    `/cars/${seededCar.carId}/journal`,
  )

  await snap(page, 'overview')
})

test('Обзор (Б2): скелетон, пока данные грузятся', async ({ page, seededCar }) => {
  await page.route(ANALYTICS_URL, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
    await route.continue()
  })
  await page.goto(`/cars/${seededCar.carId}`)

  await expect(page.locator('[data-skeleton="card"]').first()).toBeVisible()
  await expect(page.locator('[data-skeleton="row"]')).toHaveCount(3)
  await expect(page.getByTestId('overview-mileage')).toHaveCount(0)
  await snap(page, 'overview-loading')

  await expect(page.getByTestId('overview-mileage')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-skeleton]')).toHaveCount(0)
})

test('Обзор: ошибка загрузки и «Повторить»', async ({ page, seededCar }) => {
  await page.route(ANALYTICS_URL, (route) => route.abort())
  await page.goto(`/cars/${seededCar.carId}`)

  await expect(page.getByRole('heading', { name: 'Не удалось загрузить обзор' })).toBeVisible()
  await snap(page, 'overview-error')

  await page.unroute(ANALYTICS_URL)
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByTestId('overview-mileage')).toHaveText(/87\s450\s+км/)
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить обзор' })).toHaveCount(0)
})

test('Обзор: машина без записей и напоминаний — пусто', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carIds.rio}`)

  await expect(page.getByTestId('overview-mileage')).toHaveText(/42\s100\s+км/)
  // Пробег не обновлялся — подписи нет; внимания ничего не требует — блока нет
  await expect(page.getByText(/обновлён/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Требует внимания' })).toHaveCount(0)
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^0\s₽$/)
  await expect(page.getByRole('heading', { name: 'Записей пока нет' })).toBeVisible()

  await snap(page, 'overview-empty')
})
