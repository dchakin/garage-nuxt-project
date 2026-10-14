import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('UI-кит: шапки и нижняя панель', async ({ page }) => {
  await page.goto('/dev/ui?group=nav')

  const switcher = page.getByRole('button', { name: 'Сменить машину: Toyota Camry' })
  await expect(switcher).toBeVisible()
  await switcher.click()
  await expect(page.getByTestId('switch-count')).toHaveText('Переключатель: 1')
  await expect(page.getByRole('link', { name: 'Профиль' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Изменить автомобиль' })).toBeVisible()

  const withOverview = page.getByRole('navigation', { name: 'Разделы машины, пример 2' })
  await expect(withOverview.getByRole('link', { name: 'Обзор' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(withOverview.getByRole('link', { name: /Напоминания/ })).toHaveAttribute(
    'href',
    '/cars/1/reminders',
  )
  await expect(withOverview.getByText('3', { exact: true })).toBeVisible()

  // badge = 0 — счётчика нет
  const withoutBadge = page.getByRole('navigation', { name: 'Разделы машины, пример 4' })
  await expect(withoutBadge.getByRole('link', { name: 'Напоминания', exact: true })).toBeVisible()

  await withOverview.getByRole('button', { name: 'Добавить запись' }).click()
  await expect(page.getByTestId('add-count')).toHaveText('Добавить: 1')

  await snap(page, 'ui-nav')
})
