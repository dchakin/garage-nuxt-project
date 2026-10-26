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
  await expect(page.getByRole('heading', { name: 'Восстановить пароль' })).toBeVisible()
  await expect(page.getByText('Пришлём ссылку для нового пароля на почту')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Назад' })).toHaveAttribute('href', '/login')
  await expect(page.getByRole('link', { name: 'Вспомнил — войти' })).toHaveAttribute(
    'href',
    '/login',
  )
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await snap(page, 'auth-forgot')

  await page.getByRole('button', { name: 'Прислать ссылку' }).click()

  // А8: ссылка отправлена, повторная отправка — после паузы
  await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible()
  await expect(
    page.getByText(`Отправили ссылку на ${user.email}. Она действует 1 час.`),
  ).toBeVisible()
  await expect(page.getByText('загляните в «Спам»')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Открыть почту' })).toHaveAttribute('href', 'mailto:')
  const resend = page.getByTestId('resend')
  await expect(resend).toHaveText(/Отправить ещё раз · через 0:\d\d/)
  await expect(resend).toBeDisabled()
  // Ссылок «Изменить email» и «Вернуться ко входу» в макете нет
  await expect(page.getByText('Изменить email')).toHaveCount(0)
  await expect(page.getByText('Вернуться ко входу')).toHaveCount(0)
  await snap(page, 'auth-forgot-sent')

  // А9: ссылка берётся из письма в outbox
  const resetLink = await waitForResetLink(user.email)
  await page.goto(resetLink)
  await expect(page.getByRole('heading', { name: 'Новый пароль' })).toBeVisible()
  await expect(
    page.getByText('Придумайте пароль — со старым войти уже не получится.'),
  ).toBeVisible()
  await expect(page.locator('[data-variant="info"]')).toContainText(`Ссылка для ${user.email}`)
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

test('экран А7: «Вспомнил — войти» и стрелка «назад» ведут на /login', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByRole('link', { name: 'Вспомнил — войти' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/forgot-password')
  await page.getByRole('link', { name: 'Назад' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('экран А9: ссылка без email в адресе — без плашки «Ссылка для …»', async ({ page }) => {
  await page.goto('/reset-password?token=abc')
  await expect(page.getByRole('heading', { name: 'Новый пароль' })).toBeVisible()
  await expect(page.getByText('Ссылка для')).toHaveCount(0)
})
