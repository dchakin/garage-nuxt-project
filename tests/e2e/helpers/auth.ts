import { expect, type Page } from '@playwright/test'

export interface TestUser {
  name: string
  email: string
  password: string
}

// Подписи полей в текущих формах не связаны с input (нет for/id), поэтому поля ищутся по типу.
// После редизайна форм перейти на getByLabel.
const nameInput = (page: Page) => page.locator('input[type="text"]')
const emailInput = (page: Page) => page.locator('input[type="email"]')
const passwordInput = (page: Page) => page.locator('input[type="password"]')

let userCounter = 0

/** Новый пользователь с уникальным email: БД общая на весь прогон e2e. */
export function createTestUser(name = 'Дмитрий'): TestUser {
  userCounter += 1
  return {
    name,
    email: `e2e-${Date.now()}-${userCounter}@example.com`,
    password: 'e2e-password',
  }
}

/** Регистрация через форму /register; заканчивается на списке машин. */
export async function registerViaUi(page: Page, user: TestUser) {
  await page.goto('/register')
  await nameInput(page).fill(user.name)
  await emailInput(page).fill(user.email)
  await passwordInput(page).fill(user.password)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/cars$/)
}

/** Вход через форму /login; заканчивается на списке машин. */
export async function loginViaUi(page: Page, user: TestUser) {
  await page.goto('/login')
  await emailInput(page).fill(user.email)
  await passwordInput(page).fill(user.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/cars$/)
}

/**
 * Быстрая регистрация через API, минуя UI: кука сессии попадает в контекст страницы.
 * Для сценариев, где сама авторизация не проверяется.
 */
export async function registerViaApi(page: Page, user: TestUser) {
  const response = await page.request.post('/api/auth/register', { data: user })
  expect(response.ok(), await response.text()).toBe(true)
}

/** Быстрый вход через API: кука сессии попадает в контекст страницы. */
export async function loginViaApi(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  const response = await page.request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  })
  expect(response.ok(), await response.text()).toBe(true)
}

/** Выход: удаляет куку сессии из контекста. */
export async function logout(page: Page) {
  await page.request.post('/api/auth/logout')
  await page.context().clearCookies()
}
