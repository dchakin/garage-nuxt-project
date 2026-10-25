export const THEME_MODES = ['system', 'light', 'dark'] as const

/** Выбор пользователя: «как в системе» или явная тема. */
export type ThemeMode = (typeof THEME_MODES)[number]

/** Тема, которая сейчас на экране. */
export type ResolvedTheme = Exclude<ThemeMode, 'system'>

export const themeModeLabels: Record<ThemeMode, string> = {
  system: 'Системная',
  light: 'Светлая',
  dark: 'Тёмная',
}

/** Ключ localStorage; `system` не хранится — пустое значение и есть «как в системе». */
export const THEME_STORAGE_KEY = 'garage:theme'

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/** Класс на <html>, по которому tokens.css и Tailwind (`darkMode: 'class'`) включают тёмную тему. */
export const DARK_CLASS = 'dark'

/**
 * Класс на <html> на время смены темы: transition выключены (`motion.css`), иначе элементы
 * с `transition-colors` перекрашиваются плавно, а остальные — мгновенно.
 */
export const THEME_SWITCHING_CLASS = 'theme-switching'

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode)
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light'
  return mode
}
