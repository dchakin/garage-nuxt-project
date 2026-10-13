import { readonly, ref } from 'vue'
import {
  DARK_CLASS,
  DARK_SCHEME_QUERY,
  THEME_STORAGE_KEY,
  isThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '~/theme/constants'

// Состояние модульное, а не useState: клиент — чистый SPA, а composable так тестируется без Nuxt
const mode = ref<ThemeMode>('system')
const resolved = ref<ResolvedTheme>('light')
let initialized = false

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function storeMode(next: ThemeMode) {
  try {
    if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Хранилище недоступно (приватный режим) — тема просто не переживёт перезагрузку
  }
}

/** theme-color = токен `--bg` текущей темы; значение берётся из уже применённого tokens.css. */
function syncThemeColorMeta() {
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (!background) return
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}

function applyTheme() {
  resolved.value = resolveTheme(mode.value, window.matchMedia(DARK_SCHEME_QUERY).matches)
  document.documentElement.classList.toggle(DARK_CLASS, resolved.value === 'dark')
  syncThemeColorMeta()
}

function setMode(next: ThemeMode) {
  mode.value = next
  storeMode(next)
  applyTheme()
}

function initTheme() {
  initialized = true
  mode.value = readStoredMode()
  window.matchMedia(DARK_SCHEME_QUERY).addEventListener('change', () => {
    if (mode.value === 'system') applyTheme()
  })
  // Выбор, сделанный в другой вкладке
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY) return
    mode.value = readStoredMode()
    applyTheme()
  })
  applyTheme()
}

/**
 * Тема «Как в системе / Светлая / Тёмная». Первую отрисовку делает inline-скрипт из
 * `theme/initScript.ts` (nuxt.config.ts), дальше — этот composable: класс `dark` на <html>,
 * theme-color, слежение за `prefers-color-scheme` в режиме `system`.
 */
export function useTheme() {
  if (!initialized) initTheme()
  return { mode: readonly(mode), resolved: readonly(resolved), setMode }
}
