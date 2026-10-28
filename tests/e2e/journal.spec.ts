import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const ENTRIES_URL = '**/api/cars/*/entries*'
const SLOW_RESPONSE_MS = 1_500
const CAMRY_ENTRIES_COUNT = 8
/** Год текущий, поэтому в заголовках месяцев его нет */
const CAMRY_MONTHS = ['Октябрь', 'Сентябрь', 'Август', 'Июнь', 'Май', 'Март', 'Февраль']
const SEARCH_BOX = 'Поиск по записям'

/** Строки записей, сгруппированных по месяцам */
const groupedRows = (page: import('@playwright/test').Page) => page.locator('[data-month] li')

test('Журнал (В1): записи по месяцам с суммами, строка из двух линий', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)

  await expect(page.getByRole('heading', { name: 'Журнал', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Сортировка: по дате' })).toBeVisible()
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  const monthHeadings = page.locator('[data-month] h3')
  await expect(monthHeadings).toHaveText(CAMRY_MONTHS)
  await expect(page.getByTestId('journal-summary')).toHaveText(
    /^2026 год · 8 записей · 88\s500\s₽$/,
  )

  // Сентябрь: 3 500 + 6 800 = 10 300 ₽
  const september = page.locator('[data-month="2026-09"]')
  await expect(september.getByRole('heading', { name: 'Сентябрь', exact: true })).toBeVisible()
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
  await expect(page.locator('[data-month] h3')).toHaveText(['Август', 'Июнь'])
  await expect(groupedRows(page).first()).toContainText('Не заводился — заменили аккумулятор')
  // 9 900 + 7 500 = 17 400 ₽, при фильтре без года
  await expect(page.getByTestId('journal-summary')).toHaveText(/^2 записи · 17\s400\s₽$/)
  await snap(page, 'journal-filter-repair')

  await page.getByRole('button', { name: 'Все', exact: true }).click()
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
})

test('Журнал: поиск по описанию и месту', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('searchbox', { name: SEARCH_BOX }).fill('сервис на ленина')

  // Три записи в «Сервис на Ленина»
  await expect(groupedRows(page)).toHaveCount(3)
})

test('Журнал (В3): ничего не найдено и «Сбросить»', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('searchbox', { name: SEARCH_BOX }).fill('вертолёт')

  await expect(
    page.getByRole('heading', { name: 'Ничего не нашли по «вертолёт»', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Ищем по описанию, месту и категории. Попробуйте другое слово или сбросьте фильтр.',
    ),
  ).toBeVisible()
  await expect(groupedRows(page)).toHaveCount(0)
  // Поиск остаётся на месте, чтобы его исправить
  await expect(page.getByRole('searchbox', { name: SEARCH_BOX })).toHaveValue('вертолёт')
  await snap(page, 'journal-not-found')

  await page.getByRole('button', { name: 'Сбросить поиск', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Ничего не нашли/ })).toHaveCount(0)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  await expect(page.getByRole('searchbox', { name: SEARCH_BOX })).toHaveValue('')
})

test('Журнал: чип без записей → «Все» не показывает «Записей пока нет»', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  // «Ремонт» отвечает пустым списком, а возврат к «Все» идёт медленно: пока ответа нет,
  // пустое состояние журнала показываться не должно
  await page.route(ENTRIES_URL, async (route) => {
    if (new URL(route.request().url()).searchParams.get('type') === 'repair') {
      await route.fulfill({ json: [] })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS))
    await route.continue()
  })

  await page.getByRole('button', { name: 'Ремонт', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ничего не нашли', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Сбросить фильтр', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Все', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Записей пока нет' })).toHaveCount(0)
  await expect(page.getByTestId('journal-filters')).toBeVisible()

  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Записей пока нет' })).toHaveCount(0)
  await expect(page.getByTestId('journal-filters')).toBeVisible()
  await snap(page, 'journal-after-empty-filter')
})

test('Журнал: по пробегу — без групп по месяцам', async ({ page, seededCar }) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  await page.getByRole('button', { name: 'Сортировка: по дате' }).click()

  await expect(page.getByRole('button', { name: 'Сортировка: по пробегу' })).toBeVisible()
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
  await expect(
    page.getByText(
      'Записывайте ТО, ремонты и покупки — здесь появится история машины с итогами по месяцам. Поиск и фильтры появятся, когда будет что искать.',
    ),
  ).toBeVisible()
  await expect(page.getByTestId('journal-filters')).toHaveCount(0)
  await expect(page.getByTestId('journal-sort')).toHaveCount(0)
  await snap(page, 'journal-empty')

  // «Добавить запись» в теле экрана (не «＋» в панели) открывает шторку записи
  await page.getByRole('main').getByRole('button', { name: 'Добавить запись' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('Журнал: длинное название переносится на вторую строку, а не обрезается', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)

  const titles = page.getByTestId('row-entry-title')
  await expect(titles.first()).toHaveText('Щётки стеклоочистителя')
  const oneLine = (await titles.first().boundingBox())!.height
  const long = page.getByTestId('row-entry-title').filter({ hasText: 'Не заводился' })
  const twoLines = (await long.boundingBox())!.height

  expect(await long.evaluate((el) => getComputedStyle(el).webkitLineClamp)).toBe('2')
  expect(twoLines).toBeGreaterThan(oneLine * 1.5)
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
  await expect(
    page.getByText(
      'Сервер не ответил. Ваши записи в безопасности — попробуйте ещё раз через минуту.',
    ),
  ).toBeVisible()
  await snap(page, 'journal-error')

  await page.unroute(ENTRIES_URL)
  await page.getByRole('button', { name: 'Повторить' }).click()

  await expect(groupedRows(page)).toHaveCount(CAMRY_ENTRIES_COUNT)
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить журнал' })).toHaveCount(0)
})

test('Журнал: под чипами нет горизонтальной полосы прокрутки, лента листается', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${seededCar.carId}/journal`)
  const chips = page.getByRole('group', { name: 'Тип записи' })
  await expect(chips).toBeVisible()

  const metrics = await chips.evaluate((element) => ({
    scrollbarHeight: (element as HTMLElement).offsetHeight - element.clientHeight,
    scrollbarWidthStyle: getComputedStyle(element).scrollbarWidth,
    scrollable: element.scrollWidth > element.clientWidth,
  }))
  expect(metrics.scrollbarWidthStyle).toBe('none')
  expect(metrics.scrollbarHeight).toBe(0)
  expect(metrics.scrollable).toBe(true)

  await chips.evaluate((element) => element.scrollTo({ left: element.scrollWidth }))
  await expect.poll(() => chips.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await snap(page, 'journal-chips-no-scrollbar')
})
