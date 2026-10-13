import type { Entry } from '@garage/shared/types'
import { expect, test } from './fixtures'
import { CAMRY_ENTRIES_TOTAL } from './fixtures/reference'
import { seedReferenceData } from './fixtures/seed'
import { loginViaApi } from './helpers/auth'

test('фикстура: журнал Camry — 8 записей на 88 500 ₽', async ({ page, seededCar }) => {
  const response = await page.request.get(`/api/cars/${seededCar.carId}/entries`)
  expect(response.ok(), await response.text()).toBe(true)

  const entries: Entry[] = await response.json()
  expect(entries).toHaveLength(8)
  expect(entries.reduce((sum, entry) => sum + (entry.cost ?? 0), 0)).toBe(CAMRY_ENTRIES_TOTAL)
  expect(entries.every((entry) => entry.date.startsWith('2026-'))).toBe(true)
})

test('фикстура: машины, участники и напоминания', async ({ page, seededCar }) => {
  const cars = await (await page.request.get('/api/cars')).json()
  expect(cars.map((car: { model: string }) => car.model).sort()).toEqual(['Camry', 'Largus', 'Rio'])

  const reminders = await (await page.request.get(`/api/cars/${seededCar.carId}/reminders`)).json()
  expect(reminders).toHaveLength(5)
  expect(reminders.filter((reminder: { isActive: boolean }) => !reminder.isActive)).toHaveLength(1)

  const camry = await (await page.request.get(`/api/cars/${seededCar.carId}`)).json()
  expect(camry.currentMileage).toBe(87_450)
  expect(camry.members.map((member: { user: { email: string } }) => member.user.email)).toEqual([
    'anna@mail.ru',
  ])
})

test('повторный сид возвращает данные к эталону', async ({ page, seededCar }) => {
  const entriesUrl = (carId: number) => `/api/cars/${carId}/entries`
  const [firstEntry] = await (await page.request.get(entriesUrl(seededCar.carId))).json()
  expect((await page.request.delete(`/api/entries/${firstEntry.id}`)).ok()).toBe(true)

  // Пользователи пересоздаются с новыми id — нужен новый вход
  const reseeded = await seedReferenceData()
  await loginViaApi(page, reseeded.users.dmitry)
  const entries = await (await page.request.get(entriesUrl(reseeded.carIds.camry))).json()
  expect(entries).toHaveLength(8)
})
