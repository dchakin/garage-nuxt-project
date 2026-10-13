import { expect, test } from './helpers/test'
import { snap } from './helpers/snap'

test('UI-кит: действия и ввод', async ({ page }) => {
  await page.goto('/dev/ui?group=actions')
  await expect(page.getByRole('heading', { name: 'Действия и ввод' })).toBeVisible()

  // Кнопки: высота control-h, disabled и loading недоступны
  await expect(page.getByRole('button', { name: 'Добавить запись' })).toHaveCSS('height', '52px')
  await expect(page.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Назад' })).toHaveCSS('height', '44px')

  // Поле с ошибкой связано с текстом ошибки
  const wrongMileage = page.getByRole('textbox', { name: 'Пробег' }).nth(1)
  await expect(wrongMileage).toHaveAttribute('aria-invalid', 'true')
  await expect(wrongMileage).toHaveAccessibleDescription(/Меньше текущего/)

  // Сумма: разряды без фокуса
  await expect(page.getByRole('textbox', { name: 'Сумма' })).toHaveValue('6 800')

  // Сегменты и переключатель
  await page.getByRole('radio', { name: 'Год' }).click()
  await expect(page.getByRole('radio', { name: 'Год' })).toHaveAttribute('aria-checked', 'true')
  const push = page.getByRole('switch', { name: 'Напоминание', exact: true })
  await push.click()
  await expect(push).toHaveAttribute('aria-checked', 'true')

  // Чип фильтра: выбор одного снимает «Все»
  await page.getByRole('button', { name: 'Ремонт' }).click()
  await expect(page.getByRole('button', { name: 'Ремонт' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Все', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  // Вернуть состояние макета перед скриншотом
  await page.getByRole('radio', { name: 'Месяц' }).click()
  await page.getByRole('button', { name: 'Все', exact: true }).click()
  await snap(page, 'ui-actions')
})
