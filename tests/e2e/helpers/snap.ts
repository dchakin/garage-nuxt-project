import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const SCREENS_DIR = path.resolve('test-results/screens')

type Theme = 'light' | 'dark'

// Тёмная тема появится в задаче темы (#32): тогда добавить 'dark' — переключение ниже уже готово
const THEMES: Theme[] = ['light']

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
