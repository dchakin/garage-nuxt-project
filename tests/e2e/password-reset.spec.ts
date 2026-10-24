import { createTestUser, loginViaUi, logout, registerViaApi } from './helpers/auth'
import { waitForResetLink } from './helpers/mailbox'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

const NEW_PASSWORD = 'new-e2e-password'

test('восстановление пароля: письмо → новый пароль → вход (А7–А9)', async ({ page }) => {
  const user = createTestUser()
  await registerViaApi(page, user)
  await logout(page)

  // А7: со входа по ссылке «Забыли пароль?»
  await page.goto('/login')
  await page.getByRole('link', { name: 'Забыли пароль?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByRole('heading', { name: 'Восстановление пароля' })).toBeVisible()
  await snap(page, 'auth-forgot')

  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Отправить ссылку' }).click()

  // А8: ссылка отправлена, повторная отправка — после паузы
  await expect(page.getByRole('heading', { name: 'Ссылка отправлена' })).toBeVisible()
  await expect(page.getByText('Ссылка действует 1 час')).toBeVisible()
  await expect(page.getByText(user.email)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Открыть почту' })).toHaveAttribute('href', 'mailto:')
  await expect(page.getByTestId('resend-timer')).toHaveText(/Отправить ещё раз можно через \d+ с/)
  await expect(page.getByRole('button', { name: 'Отправить ещё раз' })).toHaveCount(0)
  await snap(page, 'auth-forgot-sent')

  // А9: ссылка берётся из письма в outbox
  const resetLink = await waitForResetLink(user.email)
  await page.goto(resetLink)
  await expect(page.getByRole('heading', { name: 'Новый пароль' })).toBeVisible()
  await expect(page.getByText('Минимум 6 символов')).toBeVisible()
  await snap(page, 'auth-reset')

  const passwordField = page.getByLabel('Новый пароль', { exact: true })
  await passwordField.fill('12345')
  await page.getByRole('button', { name: 'Сохранить и войти' }).click()
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(1)
  await expect(page).toHaveURL(/\/reset-password\?token=/)
  await snap(page, 'auth-reset-error')

  await passwordField.fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Сохранить и войти' }).click()
  await expect(page).toHaveURL(/\/cars$/)

  // Ссылка одноразовая: повторный сброс по ней отклоняется
  await page.goto(resetLink)
  await page.getByLabel('Новый пароль', { exact: true }).fill('another-password')
  await page.getByRole('button', { name: 'Сохранить и войти' }).click()
  await expect(page.getByRole('heading', { name: 'Ссылка не подходит' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Ссылка недействительна или устарела')
  await expect(page.getByRole('link', { name: 'Запросить новую ссылку' })).toHaveAttribute(
    'href',
    '/forgot-password',
  )
  await snap(page, 'auth-reset-invalid')

  // Войти можно новым паролем
  await logout(page)
  await loginViaUi(page, { ...user, password: NEW_PASSWORD })
})

test('ссылка сброса без токена сразу показывает «Ссылка не подходит»', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByRole('heading', { name: 'Ссылка не подходит' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Запросить новую ссылку' })).toBeVisible()
})

test('экран А7: «Вернуться ко входу» ведёт на /login', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByRole('link', { name: 'Вернуться ко входу' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
