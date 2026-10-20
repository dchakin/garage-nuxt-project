import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

// Список экрана — без фильтра; бейдж вкладки (layout) просит `?isActive=true` и не трогаем
const REMINDERS_API = (url: URL) =>
  /\/api\/cars\/\d+\/reminders$/.test(url.pathname) && !url.searchParams.has('isActive')
const SLOW_RESPONSE_MS = 1_500

test('Напоминания (Г1): группы по статусам на эталонных данных', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  await expect(page.getByRole('heading', { name: 'Напоминания', level: 1 })).toBeAttached()

  const overdue = page.getByTestId('reminder-group-overdue')
  await expect(overdue.getByRole('heading', { name: '2 просрочено' })).toBeVisible()
  await expect(overdue.getByRole('article')).toHaveCount(2)
  await expect(overdue.getByRole('heading', { name: 'Замена масла' })).toBeVisible()
  await expect(overdue.getByRole('heading', { name: 'Техосмотр' })).toBeVisible()
  await expect(overdue.getByText(/Срок был 87\s200\sкм/)).toBeVisible()
  await expect(overdue.getByRole('button', { name: 'Сделал' })).toHaveCount(2)

  const soon = page.getByTestId('reminder-group-soon')
  await expect(soon.getByRole('heading', { name: '1 скоро' })).toBeVisible()
  await expect(soon.getByRole('heading', { name: 'ОСАГО' })).toBeVisible()

  const ok = page.getByTestId('reminder-group-ok')
  await expect(ok.getByRole('heading', { name: '1 в порядке' })).toBeVisible()
  await expect(ok.getByRole('heading', { name: 'Замена ГРМ' })).toBeVisible()
  await expect(ok.getByRole('button', { name: 'Сделал' })).toHaveCount(0)

  // Выключенное — отдельной группой, в конце
  const inactive = page.getByTestId('reminder-group-inactive')
  await expect(inactive.getByRole('heading', { name: '1 выключено' })).toBeVisible()
  await expect(inactive.getByRole('heading', { name: 'Сезонная смена шин' })).toBeVisible()
  await expect(page.locator('[data-testid^="reminder-group-"]')).toHaveCount(4)

  // Просрочено → скоро → в порядке → выключено
  const order = await page
    .locator('[data-testid^="reminder-group-"]')
    .evaluateAll((groups) => groups.map((group) => group.getAttribute('data-testid')))
  expect(order).toEqual([
    'reminder-group-overdue',
    'reminder-group-soon',
    'reminder-group-ok',
    'reminder-group-inactive',
  ])

  // Внимание требуют — «Всё в порядке» не показываем
  await expect(page.getByText('Всё в порядке')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Добавить напоминание' })).toBeVisible()

  await snap(page, 'reminders')
})

test('Напоминания (Г2): у машины их нет — пусто с действием', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carIds.rio}/reminders`)

  await expect(page.getByRole('heading', { name: 'Напоминаний пока нет' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Добавить напоминание' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)

  await snap(page, 'reminders-empty')
})

test('Напоминания (Г3): ничего не просрочено — «Всё в порядке»', async ({ page, seededCar }) => {
  const { rio } = seededCar.carIds
  for (const reminder of [
    { title: 'Замена масла', intervalKm: 10_000, nextDueMileage: 60_000 },
    { title: 'ОСАГО', intervalMonths: 12, nextDueDate: '2027-08-01' },
  ]) {
    const response = await page.request.post(`/api/cars/${rio}/reminders`, { data: reminder })
    expect(response.ok()).toBe(true)
  }

  await page.goto(`/cars/${rio}/reminders`)

  await expect(page.getByRole('status').filter({ hasText: 'Всё в порядке' })).toBeVisible()
  await expect(page.getByTestId('reminder-group-ok').getByRole('article')).toHaveCount(2)
  await expect(page.getByTestId('reminder-group-overdue')).toHaveCount(0)
  await expect(page.getByTestId('reminder-group-soon')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Сделал' })).toHaveCount(0)

  await snap(page, 'reminders-all-ok')
})

test('Напоминания: скелетон при медленной загрузке', async ({ page, seededCar }) => {
  await page.route(REMINDERS_API, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
    await route.continue()
  })
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  await expect(page.locator('[data-skeleton="card"]').first()).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)

  await expect(page.getByRole('article').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-skeleton]')).toHaveCount(0)
})

test('Напоминания: ошибка загрузки и «Повторить»', async ({ page, seededCar }) => {
  await page.route(REMINDERS_API, (route) => route.abort())
  await page.goto(`/cars/${seededCar.carId}/reminders`)

  await expect(
    page.getByRole('heading', { name: 'Не удалось загрузить напоминания' }),
  ).toBeVisible()

  await page.unroute(REMINDERS_API)
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('article')).toHaveCount(5)
})
