import { expect, test } from './fixtures'
import { loginRedirectingTo, loginViaApi } from './helpers/auth'
import { snap } from './helpers/snap'

const NONEXISTENT_CAR_ID = 999_999
const OPEN_CARS_LABEL = 'К моим машинам'

test('И6: чужая машина — «Нет доступа», кнопка ведёт к списку машин', async ({
  page,
  seededCar,
}) => {
  // Сергей — без машин, Camry для него чужая
  await loginViaApi(page, seededCar.users.sergey)
  await page.goto(`/cars/${seededCar.carIds.camry}`)

  await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible()
  await expect(page.getByText(/владелец убрал вас из участников/)).toBeVisible()
  await snap(page, 'error-403')

  await page.getByRole('button', { name: OPEN_CARS_LABEL }).click()
  await expect(page).toHaveURL(/\/cars$/)
  await expect(page.getByRole('heading', { name: 'Мои автомобили' })).toBeVisible()
})

test('И6: участника убрали из машины — открытие даёт «Нет доступа»', async ({
  page,
  seededCar,
}) => {
  const { carIds, users } = seededCar
  const removal = await page.request.delete(`/api/cars/${carIds.camry}/members/${users.anna.id}`)
  expect(removal.ok(), await removal.text()).toBe(true)

  await loginViaApi(page, users.anna)
  await page.goto(`/cars/${carIds.camry}/journal`)

  await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible()
})

test('И4: несуществующая машина и неизвестный адрес — «Страница не найдена»', async ({
  page,
  seededCar,
}) => {
  await page.goto(`/cars/${NONEXISTENT_CAR_ID}`)
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
  await snap(page, 'error-404')

  await page.getByRole('button', { name: OPEN_CARS_LABEL }).click()
  await expect(page).toHaveURL(/\/cars$/)

  await page.goto(`/cars/${seededCar.carId}/no-such-tab`)
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
})

test('И5: сбой сервера — «Что-то пошло не так», «Повторить» открывает машину', async ({
  page,
  seededCar,
}) => {
  const carUrl = `**/api/cars/${seededCar.carId}`
  await page.route(carUrl, (route) =>
    route.fulfill({ status: 500, json: { statusCode: 500, statusMessage: 'Internal Error' } }),
  )
  await page.goto(`/cars/${seededCar.carId}`)

  await expect(page.getByRole('heading', { name: 'Что-то пошло не так' })).toBeVisible()
  await snap(page, 'error-500')

  await page.unroute(carUrl)
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('button', { name: /Сменить машину: Toyota Camry/ })).toBeVisible()
})

test('И7: сессия истекла посреди работы — экран, вход и возврат на тот же маршрут', async ({
  page,
  seededCar,
}) => {
  const { carId, users } = seededCar
  await page.goto(`/cars/${carId}/journal`)
  await expect(page.getByRole('heading', { name: 'Журнал', level: 1 })).toBeAttached()

  // Сессия «истекла»: кука пропала, следующий запрос данных получает 401
  await page.context().clearCookies()
  await page.getByRole('link', { name: /Напоминания/ }).click()

  await expect(page.getByRole('heading', { name: 'Сессия истекла' })).toBeVisible()
  await snap(page, 'error-session-expired')

  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(loginRedirectingTo(`/cars/${carId}/reminders`))

  await page.getByLabel('Email', { exact: true }).fill(users.dmitry.email)
  await page.getByLabel('Пароль', { exact: true }).fill(users.dmitry.password)
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).toHaveURL(new RegExp(`/cars/${carId}/reminders$`))
  await expect(page.getByRole('heading', { name: 'Напоминания', level: 1 })).toBeAttached()
})

test('вход по ссылке на закрытую страницу возвращает на неё, чужой redirect игнорируется', async ({
  page,
  seededCar,
}) => {
  const { users } = seededCar
  await page.context().clearCookies()

  await page.goto('/profile')
  await expect(page).toHaveURL(loginRedirectingTo('/profile'))
  await page.getByLabel('Email', { exact: true }).fill(users.dmitry.email)
  await page.getByLabel('Пароль', { exact: true }).fill(users.dmitry.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/profile$/)

  await page.context().clearCookies()
  await page.goto('/login?redirect=//evil.example')
  await page.getByLabel('Email', { exact: true }).fill(users.dmitry.email)
  await page.getByLabel('Пароль', { exact: true }).fill(users.dmitry.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/cars$/)
})
