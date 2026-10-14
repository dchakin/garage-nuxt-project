import { createTestUser, registerViaApi } from './helpers/auth'
import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('UI-кит: шторка закрывается по Esc, затемнению и свайпу и возвращает фокус', async ({
  page,
}) => {
  await page.goto('/dev/ui?group=overlays')
  const openButton = page.getByRole('button', { name: 'Открыть шторку' })
  const sheet = page.getByRole('dialog', { name: 'Новая запись' })

  await openButton.click()
  await expect(sheet).toBeVisible()
  await expect(sheet).toBeFocused()
  await expect(page.getByRole('button', { name: 'Сохранить' })).toBeInViewport()
  await snap(page, 'ui-sheet')

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(openButton).toBeFocused()

  // Тап по затемнению над шторкой
  await openButton.click()
  await page.mouse.click(195, 40)
  await expect(sheet).toBeHidden()

  // Свайп вниз за шапку
  await openButton.click()
  const header = await sheet.locator('header').boundingBox()
  await page.mouse.move(header!.x + 60, header!.y + 10)
  await page.mouse.down()
  await page.mouse.move(header!.x + 60, header!.y + 200, { steps: 8 })
  await page.mouse.up()
  await expect(sheet).toBeHidden()
})

test('UI-кит: диалог не закрывается по затемнению, фокус на «Отмене»', async ({ page }) => {
  await page.goto('/dev/ui?group=overlays')
  await page.getByRole('button', { name: 'Открыть диалог' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Удалить Toyota Camry?' })

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Отмена' })).toBeFocused()
  await snap(page, 'ui-dialog')

  await page.mouse.click(195, 40)
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Удалить' }).click()
  await expect(dialog.getByRole('button', { name: 'Отмена' })).toBeDisabled()
  await expect(dialog).toBeHidden()
})

test('выход из аккаунта подтверждается диалогом', async ({ page }) => {
  await registerViaApi(page, createTestUser())
  await page.goto('/cars')

  await page.getByRole('button', { name: 'Выйти' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Выйти из аккаунта?' })
  await dialog.getByRole('button', { name: 'Отмена' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Выйти' }).click()
  await dialog.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
