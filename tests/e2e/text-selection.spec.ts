import { createTestUser, registerViaApi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('текст интерфейса не выделяется, поля ввода и копируемые значения — выделяются (#119)', async ({
  page,
}) => {
  const user = createTestUser()
  await registerViaApi(page, user)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible()

  const body = page.locator('body')
  await expect(body).toHaveCSS('user-select', 'none')
  await expect(body).toHaveCSS('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)')
  await expect(page.getByRole('heading', { name: 'Профиль' })).toHaveCSS('user-select', 'none')

  // email в блоке «Аккаунт» можно скопировать
  await expect(page.getByTestId('account-email').getByText(user.email, { exact: true })).toHaveCSS(
    'user-select',
    'text',
  )
  // поле имени — ввод пользователя
  await expect(page.getByLabel('Имя')).toHaveCSS('user-select', 'text')

  // Двойной клик по подписи не выделяет слово
  await page.getByRole('heading', { name: 'Профиль' }).dblclick()
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')

  await snap(page, 'profile-text-selection')
})
