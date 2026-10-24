import { createTestUser, registerViaUi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

// Публичный VAPID-ключ нужен только чтобы клиент счёл push доступным (подписка в e2e не создаётся)
const FAKE_VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

test('сценарий 1: регистрация → мастер → Обзор с напоминаниями и бейджем', async ({ page }) => {
  // В headless Chromium `Notification.permission` всегда «denied» (grantPermissions его не меняет) —
  // кнопки «Включить push» не было бы
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' })
  })
  await page.route('**/api/push/config', (route) =>
    route.fulfill({ json: { vapidPublicKey: FAKE_VAPID_PUBLIC_KEY } }),
  )
  await registerViaUi(page, createTestUser())

  // А4 · Первая машина
  await expect(page.getByRole('heading', { name: 'Первая машина' })).toBeVisible()
  await expect(page.getByTestId('onboarding-step')).toHaveText('Шаг 1 из 2')
  await page.getByLabel('Марка', { exact: true }).fill('Toyota')
  await page.getByLabel('Модель', { exact: true }).fill('Camry')
  await page.getByLabel('Пробег', { exact: true }).fill('87450')
  await page.getByLabel('Год выпуска').fill('2018')
  await page.getByLabel('Госномер').fill('А123ВС 77')
  await snap(page, 'onboarding-car')
  await page.getByRole('button', { name: 'Далее' }).click()

  // А5 · Что напоминать: «последний раз» у масла и дата полиса у ОСАГО
  await expect(page.getByRole('heading', { name: 'Что напоминать' })).toBeVisible()
  await expect(page.getByTestId('onboarding-step')).toHaveText('Шаг 2 из 2')
  const oil = page.getByTestId('onboarding-template-oil')
  await oil.getByRole('button', { name: 'Указать, когда меняли' }).click()
  await oil.getByLabel('Когда меняли').fill('2025-03-01')
  await oil.getByLabel('Пробег при замене').fill('70000')
  const policy = page.getByTestId('onboarding-template-osago')
  await policy.getByLabel('Полис действует до').fill('2027-06-30')
  await expect(page.getByRole('button', { name: 'Создать 3 напоминания' })).toBeVisible()
  await snap(page, 'onboarding-reminders')
  await page.getByRole('button', { name: 'Создать 3 напоминания' }).click()

  // А6 · Первый Обзор: плашка, «Требует внимания» и бейдж на вкладке
  await expect(page).toHaveURL(/\/cars\/\d+$/)
  await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeAttached()
  const banner = page.getByTestId('onboarding-banner')
  await expect(banner).toContainText('Создали 3 напоминания')
  await expect(banner.getByRole('button', { name: 'Включить push' })).toBeVisible()
  const attention = page.locator('section', {
    has: page.getByRole('heading', { name: 'Требует внимания' }),
  })
  await expect(attention.getByRole('heading', { name: 'Замена масла' })).toBeVisible()
  await expect(page.getByText(/требуют внимания: [1-9]/)).toBeAttached()
  await snap(page, 'onboarding-overview')

  // Напоминания созданы с тремя шаблонами
  await page.getByRole('link', { name: /Напоминания/ }).click()
  await expect(page.getByRole('heading', { name: 'ОСАГО' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Техосмотр' })).toBeVisible()

  // Плашку можно скрыть
  await page.goBack()
  await page.getByTestId('onboarding-banner').getByRole('button', { name: 'Скрыть' }).click()
  await expect(page.getByTestId('onboarding-banner')).toHaveCount(0)
})

test('мастер: обязательные поля шага 1 и «Назад» без потери данных', async ({ page }) => {
  await registerViaUi(page, createTestUser())

  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByText('Укажите марку')).toBeVisible()
  await expect(page.getByText('Укажите модель')).toBeVisible()
  await expect(page.getByText('Укажите текущий пробег')).toBeVisible()
  await expect(page.getByTestId('onboarding-step')).toHaveText('Шаг 1 из 2')
  await snap(page, 'onboarding-car-errors')

  await page.getByLabel('Марка', { exact: true }).fill('Kia')
  await page.getByLabel('Модель', { exact: true }).fill('Rio')
  await page.getByLabel('Пробег', { exact: true }).fill('12000')
  await page.getByRole('button', { name: 'Далее' }).click()

  const tires = page.getByRole('switch', { name: 'Сезонная смена шин' })
  await tires.click()
  await expect(tires).toBeChecked()
  await page.getByRole('button', { name: 'Назад' }).click()

  await expect(page.getByLabel('Марка', { exact: true })).toHaveValue('Kia')
  await expect(page.getByLabel('Модель', { exact: true })).toHaveValue('Rio')
  await expect(page.getByLabel('Пробег', { exact: true })).toHaveValue(/12\s000/)
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('switch', { name: 'Сезонная смена шин' })).toBeChecked()

  // Без напоминаний мастер всё равно создаёт машину, плашки нет
  for (const name of ['Замена масла', 'ОСАГО', 'Техосмотр', 'Сезонная смена шин']) {
    await page.getByRole('switch', { name }).click()
  }
  await page.getByRole('button', { name: 'Продолжить без напоминаний' }).click()
  await expect(page).toHaveURL(/\/cars\/\d+$/)
  await expect(page.getByRole('heading', { name: 'Обзор', level: 1 })).toBeAttached()
  await expect(page.getByTestId('onboarding-banner')).toHaveCount(0)
})
