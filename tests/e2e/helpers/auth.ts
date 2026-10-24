import { expect, type Page } from '@playwright/test'

export interface TestUser {
  name: string
  email: string
  password: string
}

// exact: у поля пароля есть кнопка с aria-label «Показать пароль», обычный поиск по подписи
// «Пароль» нашёл бы и её.
const nameInput = (page: Page) => page.getByLabel('Имя', { exact: true })
const emailInput = (page: Page) => page.getByLabel('Email', { exact: true })
const passwordInput = (page: Page) => page.getByLabel('Пароль', { exact: true })

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

/** Регистрация через форму /register; заканчивается на мастере первого запуска (/onboarding). */
export async function registerViaUi(page: Page, user: TestUser) {
  await page.goto('/register')
  await nameInput(page).fill(user.name)
  await emailInput(page).fill(user.email)
  await passwordInput(page).fill(user.password)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
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

/**
 * Предикат для `toHaveURL`: экран входа с `?redirect=<path>`. Сравнивается разобранный параметр,
 * а не строка: vue-router не кодирует `/` в query, и в адресной строке путь лежит как есть.
 */
export const loginRedirectingTo = (redirectPath: string) => (url: URL) =>
  url.pathname === '/login' && url.searchParams.get('redirect') === redirectPath

/** Выход: удаляет куку сессии из контекста. */
export async function logout(page: Page) {
  await page.request.post('/api/auth/logout')
  await page.context().clearCookies()
}
