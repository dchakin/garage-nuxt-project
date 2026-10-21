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

  await expect(page.getByRole('heading', { name: 'Вход в Гараж' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toBeVisible()
  await expect(forgotLink(page)).toHaveCount(0)
  await snap(page, 'auth-login')
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
  await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible()
  await expect(page.getByText('Минимум 6 символов')).toBeVisible()
  await snap(page, 'auth-register')

  const visited: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname)
  })
  await page.getByLabel('Имя', { exact: true }).fill(user.name)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Пароль', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  await expect(page).toHaveURL(/\/cars$/)
  expect(visited).toContain('/onboarding')
})

test('регистрация с занятым email: ошибка сервера в плашке', async ({ page }) => {
  const user = createTestUser()
  await registerViaApi(page, user)
  await page.request.post('/api/auth/logout')
  await page.context().clearCookies()

  await page.goto('/register')
  await page.getByLabel('Имя', { exact: true }).fill(user.name)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Пароль', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  await expect(page.getByRole('alert')).toContainText('Не удалось зарегистрироваться')
  await expect(page).toHaveURL(/\/register$/)
  await snap(page, 'auth-register-error')
})
