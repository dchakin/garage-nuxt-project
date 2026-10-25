import { expect, test } from './fixtures'
import { loginRedirectingTo } from './helpers/auth'
import { snap } from './helpers/snap'

test('З1: смена имени, email только для чтения', async ({ page, seededCar }) => {
  const { users } = seededCar
  await page.goto('/profile')

  const account = page.getByRole('region', { name: 'Аккаунт' })
  await expect(account.getByLabel('Имя')).toHaveValue(users.dmitry.name)
  await expect(account.getByTestId('account-email')).toContainText(users.dmitry.email)
  await expect(account.getByLabel('Email')).toHaveCount(0)
  // Кнопка сохранения появляется только при изменении
  await expect(account.getByRole('button', { name: 'Сохранить имя' })).toHaveCount(0)
  await snap(page, 'profile-account')

  await account.getByLabel('Имя').fill('')
  await account.getByLabel('Имя').fill('   ')
  await account.getByRole('button', { name: 'Сохранить имя' }).click()
  await expect(account.getByText('Укажите имя')).toBeVisible()

  await account.getByLabel('Имя').fill('Дмитрий Иванов')
  await account.getByRole('button', { name: 'Сохранить имя' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Имя сохранено' })).toBeVisible()
  await expect(page.getByText('Дмитрий Иванов', { exact: true })).toBeVisible()
  await expect(account.getByRole('button', { name: 'Сохранить имя' })).toHaveCount(0)

  // Имя пережило перезагрузку: оно на сервере и в сессии
  await page.reload()
  await expect(page.getByLabel('Имя')).toHaveValue('Дмитрий Иванов')
})

test('З1: смена пароля — неверный текущий даёт ошибку у поля', async ({ page, seededCar }) => {
  const { users } = seededCar
  const newPassword = 'new-password-1'
  await page.goto('/profile')

  await page.getByRole('button', { name: 'Сменить пароль' }).click()
  const sheet = page.getByRole('dialog', { name: 'Сменить пароль' })
  await expect(sheet).toBeVisible()

  // Пустые поля — ошибки у полей, запроса нет
  await sheet.getByRole('button', { name: 'Сменить пароль' }).click()
  await expect(sheet.getByText('Введите текущий пароль')).toBeVisible()

  await sheet.getByLabel('Текущий пароль', { exact: true }).fill('wrong-password')
  await sheet.getByLabel('Новый пароль', { exact: true }).fill(newPassword)
  await sheet.getByRole('button', { name: 'Сменить пароль' }).click()
  await expect(sheet.getByText('Неверный текущий пароль')).toBeVisible()
  await expect(sheet.getByLabel('Текущий пароль', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await snap(page, 'profile-password-error')

  await sheet.getByLabel('Текущий пароль', { exact: true }).fill(users.dmitry.password)
  await sheet.getByRole('button', { name: 'Сменить пароль' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Пароль изменён' })).toBeVisible()

  // Новый пароль работает, старый — нет
  const oldLogin = await page.request.post('/api/auth/login', {
    data: { email: users.dmitry.email, password: users.dmitry.password },
  })
  expect(oldLogin.status()).toBe(401)
  const newLogin = await page.request.post('/api/auth/login', {
    data: { email: users.dmitry.email, password: newPassword },
  })
  expect(newLogin.ok()).toBe(true)
})

test('И10: удаление аккаунта перечисляет свои и чужие машины и ведёт на вход', async ({
  page,
  seededCar,
}) => {
  const { users } = seededCar
  await page.goto('/profile')
  // Список машин в диалоге берётся из состояния — дожидаемся счётчика в «Мои машины»
  await expect(page.getByRole('link', { name: /Мои машины.*3/ })).toBeVisible()

  await page.getByRole('button', { name: 'Удалить аккаунт…' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Удалить аккаунт?' })
  await expect(dialog).toBeVisible()
  const owned = dialog.getByTestId('delete-account-owned')
  await expect(owned).toContainText('Toyota Camry')
  await expect(owned).toContainText('Kia Rio')
  await expect(owned).not.toContainText('Lada Largus')
  const shared = dialog.getByTestId('delete-account-shared')
  await expect(shared).toContainText('Lada Largus')
  await snap(page, 'delete-account-dialog')

  // Отмена ничего не удаляет
  await dialog.getByRole('button', { name: 'Отмена' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/profile$/)

  await page.getByRole('button', { name: 'Удалить аккаунт…' }).click()
  await dialog.getByRole('button', { name: 'Удалить' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // Сессии больше нет, войти нельзя
  await page.goto('/profile')
  await expect(page).toHaveURL(loginRedirectingTo('/profile'))
  const login = await page.request.post('/api/auth/login', {
    data: { email: users.dmitry.email, password: users.dmitry.password },
  })
  expect(login.status()).toBe(401)
})
