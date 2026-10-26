import { createTestUser, registerViaApi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

const forgotLink = (page: import('@playwright/test').Page) =>
  page.getByRole('link', { name: 'Забыли пароль?' })

test('вход: экран А1, без почты на сервере ссылки «Забыли пароль?» нет', async ({ page }) => {
  // e2e-сервер запущен с outbox, поэтому «выключенную» почту подменяем ответом конфига
  await page.route('**/api/auth/config', (route) =>
    route.fulfill({ json: { passwordReset: false } }),
  )
  const configLoaded = page.waitForResponse('**/api/auth/config')
  await page.goto('/login')
  await configLoaded

  await expect(page.getByRole('heading', { name: 'Гараж' })).toBeVisible()
  await expect(page.getByText('Сервисная книжка машины в телефоне')).toBeVisible()
  await expect(page.getByPlaceholder('you@mail.ru')).toBeVisible()
  await expect(page.getByPlaceholder('Пароль')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Нет аккаунта? Создать' })).toHaveAttribute(
    'href',
    '/register',
  )
  await expect(forgotLink(page)).toHaveCount(0)
  await snap(page, 'auth-login')
})

test('вход: «Войти» прибита к низу экрана, «Забыли пароль?» — слева под полем', async ({
  page,
}) => {
  await page.goto('/login')
  const submit = page.getByRole('button', { name: 'Войти' })
  const viewportHeight = page.viewportSize()!.height
  const submitBox = (await submit.boundingBox())!
  const forgotBox = (await forgotLink(page).boundingBox())!
  const passwordBox = (await page.getByLabel('Пароль', { exact: true }).boundingBox())!

  // Кнопка и ссылка «Создать» занимают нижнюю часть окна, между ними и полями — свободное место
  expect(submitBox.y).toBeGreaterThan(viewportHeight * 0.7)
  expect(forgotBox.y).toBeGreaterThan(passwordBox.y)
  expect(forgotBox.y).toBeLessThan(viewportHeight * 0.6)
  expect(forgotBox.x).toBeLessThan(40)
})

test('вход: ссылка «Забыли пароль?» появляется, когда на сервере включена почта', async ({
  page,
}) => {
  await page.goto('/login')

  await expect(forgotLink(page)).toBeVisible()
  await expect(forgotLink(page)).toHaveAttribute('href', '/forgot-password')
  await snap(page, 'auth-login-forgot')
})

test('вход с неверным паролем: только плашка, поля не подсвечены (А2)', async ({ page }) => {
  const user = createTestUser()
  await registerViaApi(page, user)
  await page.request.post('/api/auth/logout')
  await page.context().clearCookies()

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page.getByRole('alert')).toContainText('Неверный email или пароль')
  await expect(page.getByRole('alert')).toContainText(
    'Проверьте раскладку и Caps Lock. Забыли пароль — восстановите по ссылке ниже.',
  )
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
  await snap(page, 'auth-login-error')
})

test('пароль можно показать и скрыть', async ({ page }) => {
  await page.goto('/login')
  const password = page.getByLabel('Пароль', { exact: true })
  await password.fill('secret-1')
  await expect(password).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Показать пароль' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Скрыть пароль' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('регистрация: экран А3, после неё открывается мастер /onboarding', async ({ page }) => {
  const user = createTestUser()
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Создать аккаунт' })).toBeVisible()
  await expect(page.getByText('Три поля — и можно добавлять машину.')).toBeVisible()
  await expect(page.getByText('Минимум 6 символов')).toBeVisible()
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)

  // Подсказка живая: пока пароль короче минимума — ошибка с остатком, потом снова подсказка
  await page.getByLabel('Как вас зовут', { exact: true }).fill(user.name)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  const password = page.getByLabel('Пароль', { exact: true })
  await password.fill('123')
  await expect(page.getByText('Минимум 6 символов — осталось 3')).toBeVisible()
  await expect(password).toHaveAttribute('aria-invalid', 'true')
  await snap(page, 'auth-register')

  await password.fill(user.password)
  await expect(page.getByText('Минимум 6 символов', { exact: true })).toBeVisible()
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()

  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByRole('heading', { name: 'Ваша машина' })).toBeVisible()
})

test('регистрация с занятым email: ошибка сервера в плашке', async ({ page }) => {
  const user = createTestUser()
  await registerViaApi(page, user)
  await page.request.post('/api/auth/logout')
  await page.context().clearCookies()

  await page.goto('/register')
  await page.getByLabel('Как вас зовут', { exact: true }).fill(user.name)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Пароль', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()

  await expect(page.getByRole('alert')).toContainText('Не удалось зарегистрироваться')
  await expect(page).toHaveURL(/\/register$/)
  await snap(page, 'auth-register-error')
})
