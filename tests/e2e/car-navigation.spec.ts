import { expect, test } from './fixtures'
import { snap } from './helpers/snap'

const tabBar = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Разделы машины' })

test('вкладки машины и бейдж напоминаний', async ({ page, seededCar }) => {
  const { camry } = seededCar.carIds
  await page.goto(`/cars/${camry}`)

  const tabs = tabBar(page)
  await expect(tabs.getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page')
  // Camry: 2 просрочено + 1 скоро
  const remindersTab = tabs.getByRole('link', { name: /^Напоминания.*требуют внимания: 3$/ })
  await expect(remindersTab).toBeVisible()
  await expect(remindersTab.getByText('3', { exact: true })).toBeVisible()

  await tabs.getByRole('link', { name: 'Журнал' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/journal$`))
  await expect(tabs.getByRole('link', { name: 'Журнал' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Журнал' })).toBeVisible()

  await remindersTab.click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/reminders$`))
  await expect(page.getByRole('heading', { name: 'Напоминания' })).toBeVisible()

  await tabs.getByRole('link', { name: 'Расходы' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}/expenses$`))
  await expect(page.getByRole('heading', { name: 'Расходы скоро появятся' })).toBeVisible()

  await tabs.getByRole('link', { name: 'Обзор' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
  await snap(page, 'car-overview')

  await tabs.getByRole('button', { name: 'Добавить запись' }).click()
  await expect(page.getByRole('dialog', { name: 'Новая запись' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/cars/${camry}$`))
})

test('переключатель машин (Б4) и запоминание последней машины', async ({ page, seededCar }) => {
  const { camry, rio } = seededCar.carIds
  await page.goto(`/cars/${camry}/reminders`)

  await page.getByRole('button', { name: 'Сменить машину: Toyota Camry' }).click()
  const sheet = page.getByRole('dialog', { name: 'Мои машины' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('listitem')).toHaveCount(3)
  const camryRow = sheet.getByRole('button', { name: /Toyota Camry/ })
  await expect(camryRow).toHaveAttribute('aria-current', 'true')
  await expect(camryRow.getByText('2 просрочено')).toBeVisible()
  await expect(
    sheet.getByRole('button', { name: /Lada Largus/ }).getByText('1 скоро'),
  ).toBeVisible()
  await expect(sheet.getByRole('link', { name: 'Настройки Toyota Camry' })).toHaveAttribute(
    'href',
    `/cars/${camry}/settings`,
  )
  await snap(page, 'car-switcher')

  // Переключение остаётся на той же вкладке
  await sheet.getByRole('button', { name: /Kia Rio/ }).click()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/cars/${rio}/reminders$`))
  await expect(page.getByRole('button', { name: 'Сменить машину: Kia Rio' })).toBeVisible()

  // У Rio напоминаний нет — счётчика нет
  const tabs = tabBar(page)
  await expect(tabs.getByRole('link', { name: 'Напоминания', exact: true })).toBeVisible()
  await expect(tabs.getByText(/требуют внимания/)).toHaveCount(0)

  // После перезагрузки `/` открывает «Обзор» последней машины
  await page.goto('/')
  await expect(page).toHaveURL(new RegExp(`/cars/${rio}$`))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Сменить машину: Kia Rio' })).toBeVisible()
})

// seededCar нужен ради входа Дмитрием
test('недоступная запомненная машина: `/` ведёт на список машин', async ({ page, seededCar }) => {
  await page.goto('/cars')
  await page.evaluate(() => localStorage.setItem('garage:lastCarId', '999999'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/cars$/)
  expect(await page.evaluate(() => localStorage.getItem('garage:lastCarId'))).toBeNull()
})
