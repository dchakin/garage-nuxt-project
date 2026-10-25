import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { loginViaApi, logout } from './helpers/auth'
import { snap } from './helpers/snap'

/** Сценарии макета целиком (`design/export/Сценарий-N.png`) на эталонных данных. */

const carTabs = (page: Page) => page.getByRole('navigation', { name: 'Разделы машины' })

test('Сценарий 2: запись о ТО с «Обзора» за 4 тапа попадает в журнал', async ({
  page,
  seededCar,
}) => {
  const { carId } = seededCar
  // Шаг 1 — Б1
  await page.goto(`/cars/${carId}`)
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)

  // Шаг 2 — Д1: тап «＋», пробег и дата подставлены
  await carTabs(page).getByRole('button', { name: 'Добавить запись' }).click() // тап 1
  const sheet = page.getByRole('dialog', { name: 'Новая запись' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Пробег')).toHaveValue(/^87\s450$/)
  await expect(sheet.getByLabel('Дата')).toHaveValue('2026-10-10')

  // Шаг 3 — Д1 заполненная: тип, название, сумма
  await sheet.getByRole('radio', { name: 'ТО' }).click() // тап 2
  await sheet.getByLabel('Что сделали').fill('ТО: проверка тормозов и подвески')
  await sheet.getByLabel('Сумма').fill('2500') // тап 3
  await snap(page, 'scenario-2-sheet')
  await sheet.getByRole('button', { name: 'Сохранить' }).click() // тап 4

  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Запись добавлена' })).toBeVisible()
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^3\s700\s₽$/)

  // Шаг 4 — В1: новая запись сверху, октябрь 3 700 ₽
  await carTabs(page).getByRole('link', { name: 'Журнал' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}/journal$`))
  await expect(page.locator('[data-month] li')).toHaveCount(9)
  const october = page.locator('[data-month="2026-10"]')
  await expect(october).toContainText(/3\s700\s₽/)
  const newest = october.getByRole('listitem').first()
  await expect(newest).toContainText('ТО: проверка тормозов и подвески')
  await expect(newest).toContainText(/2\s500\s₽/)
  await expect(newest).toContainText(/10\sокт\s·\s87\s450\sкм/)
  await snap(page, 'scenario-2-journal')
})

test('Сценарий 5: владелец добавляет участника, машина сразу появляется у него', async ({
  page,
  seededCar,
}) => {
  const { carId, users } = seededCar
  // Шаг 1 — Б1 → Б4: тап по названию машины
  await page.goto(`/cars/${carId}`)
  await page.getByRole('button', { name: /^Сменить машину/ }).click()
  const switcher = page.getByRole('dialog', { name: 'Мои машины' })
  await expect(switcher).toBeVisible()

  // Шаг 2 — Б4 → З2: «Настройки Toyota Camry»
  await switcher.getByRole('link', { name: 'Настройки Toyota Camry' }).click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}/settings$`))
  const members = page.getByTestId('members-list')
  await expect(members).toContainText(users.anna.name)
  await expect(members).not.toContainText(users.sergey.name)

  // Шаг 3 — З2 → И1: email Сергея, права участника объяснены
  await page.getByRole('button', { name: 'Пригласить участника' }).click()
  const sheet = page.getByRole('dialog', { name: 'Пригласить участника' })
  await expect(sheet.getByTestId('add-member-rights')).toBeVisible()
  await sheet.getByLabel('Email участника').fill(users.sergey.email)
  await snap(page, 'scenario-5-add-member')
  await sheet.getByRole('button', { name: 'Добавить', exact: true }).click()

  await expect(sheet).toBeHidden()
  await expect(members).toContainText(users.sergey.name)

  // Результат: у Сергея машина в списке сразу, без приглашения и подтверждения
  await logout(page)
  await loginViaApi(page, users.sergey)
  await page.goto('/cars')
  const camry = page.getByRole('button', { name: /Toyota Camry/ })
  await expect(camry).toBeVisible()
  await camry.click()
  await expect(page).toHaveURL(new RegExp(`/cars/${carId}$`))
  await expect(page.getByTestId('overview-month-total')).toHaveText(/^1\s200\s₽$/)
  await snap(page, 'scenario-5-member-overview')
})
