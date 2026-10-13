import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const SCREENS_DIR = path.resolve('test-results/screens')

type Theme = 'light' | 'dark'

const THEMES: Theme[] = ['light', 'dark']

// Системная тема через colorScheme, и класс — явно: если тест выбрал тему вручную,
// useTheme за colorScheme не следует
async function applyTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.evaluate((isDark) => {
    document.documentElement.classList.toggle('dark', isDark)
  }, theme === 'dark')
}

/**
 * Сохраняет скриншот текущего экрана во всех темах: test-results/screens/<name>-<theme>.png.
 * После съёмки возвращает светлую тему, чтобы не влиять на дальнейшие шаги теста.
 */
export async function snap(page: Page, name: string) {
  await mkdir(SCREENS_DIR, { recursive: true })
  for (const theme of THEMES) {
    await applyTheme(page, theme)
    await page.screenshot({
      path: path.join(SCREENS_DIR, `${name}-${theme}.png`),
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  }
  await applyTheme(page, 'light')
}
