import { DARK_CLASS, DARK_SCHEME_QUERY, THEME_STORAGE_KEY } from './constants'

export type ThemeBackgrounds = Record<'light' | 'dark', string>

/**
 * Достаёт `--bg` светлой (`:root`) и тёмной (`:root.dark`) темы из текста tokens.css —
 * чтобы theme-color и манифест не дублировали значения токенов.
 */
export function readThemeBackgrounds(tokensCss: string): ThemeBackgrounds {
  const pick = (selector: string) => {
    const block = tokensCss.match(new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`))?.[1]
    const value = block?.match(/--bg:\s*([^;]+);/)?.[1]?.trim()
    if (!value) throw new Error(`tokens.css: не найден --bg в ${selector}`)
    return value
  }
  return { light: pick(':root'), dark: pick(':root\\.dark') }
}

/**
 * Inline-скрипт для <head>: до первой отрисовки ставит класс `dark` на <html> и
 * `<meta name="theme-color">` по сохранённому выбору — без вспышки светлой темы.
 * Логика выбора та же, что в `resolveTheme` (constants.ts); после монтирования тему ведёт `useTheme()`.
 */
export function buildThemeInitScript(backgrounds: ThemeBackgrounds): string {
  const args = JSON.stringify([THEME_STORAGE_KEY, DARK_SCHEME_QUERY, DARK_CLASS, backgrounds])
  return `(function(key,query,darkClass,bg){var mode=null;try{mode=localStorage.getItem(key)}catch(e){}var dark=mode==='dark'||(mode!=='light'&&window.matchMedia(query).matches);document.documentElement.classList.toggle(darkClass,dark);var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}meta.content=dark?bg.dark:bg.light}).apply(null,${args})`
}
