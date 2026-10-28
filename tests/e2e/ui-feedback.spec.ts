import { snap } from './helpers/snap'
import { expect, test } from './helpers/test'

test('UI-кит: toast с «Отменить» вызывает действие, без действия исчезает сам', async ({
  page,
}) => {
  await page.goto('/dev/ui?group=feedback')
  const toast = page.getByTestId('toast')

  await page.getByRole('button', { name: 'Toast с «Отменить»' }).click()
  await expect(toast).toContainText('Запись удалена')
  await expect(toast).toBeInViewport()
  // Таймер на паузе, пока палец на toast, — иначе он может исчезнуть во время съёмки
  await toast.dispatchEvent('pointerdown')
  // Кольцо отсчёта: на паузе таймера анимация стоит, у toast с действием оно есть
  const countdown = toast.getByTestId('toast-countdown')
  await expect(countdown).toBeVisible()
  await expect(countdown).toHaveAttribute('data-paused', 'true')
  // snap() перематывает конечные анимации в конец (кольцо опустело бы) — фиксируем половину дуги
  await page.addStyleTag({
    content:
      '.toast-countdown-arc { animation: none !important; stroke-dashoffset: 0.5 !important }',
  })
  await snap(page, 'ui-toast')
  await toast.getByRole('button', { name: 'Отменить' }).click()
  await expect(toast).toBeHidden()
  await expect(page.getByTestId('undo-count')).toHaveText('Отменено: 1')

  await page.getByRole('button', { name: 'Toast без действия' }).click()
  await expect(toast).toContainText('Запись добавлена')
  await expect(toast.getByTestId('toast-countdown')).toHaveCount(0)
  await expect(toast).toBeHidden({ timeout: 5000 })
})

test('UI-кит: алерты, пустые состояния, мостик и раскрытие секции', async ({ page }) => {
  await page.goto('/dev/ui?group=feedback')

  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить')
  await expect(page.getByRole('heading', { name: 'Записей пока нет' })).toBeVisible()

  const bridge = page.getByRole('switch', { name: 'Закрыть «Замена масла»' })
  await expect(bridge).toHaveAttribute('aria-checked', 'true')

  const disclosure = page.getByRole('button', { name: 'Категория, место, заметка' })
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await disclosure.click()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByLabel('Место')).toBeVisible()
  await snap(page, 'ui-feedback')

  await bridge.click()
  await expect(bridge).toHaveAttribute('aria-checked', 'false')
  await disclosure.click()
  await expect(page.getByLabel('Место')).toBeHidden()
})
