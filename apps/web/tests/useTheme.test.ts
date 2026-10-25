import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, THEME_SWITCHING_CLASS } from '~/theme/constants'

type Listener = () => void

/** Управляемый prefers-color-scheme: `setSystemDark(true)` шлёт `change`, как браузер. */
function mockSystemScheme(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<Listener>()
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return dark
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  }))
  return (next: boolean) => {
    dark = next
    listeners.forEach((listener) => listener())
  }
}

/** Свежий модуль на каждый тест: состояние темы модульное и инициализируется один раз. */
async function loadUseTheme() {
  vi.resetModules()
  return (await import('~/composables/useTheme')).useTheme
}

const isDarkClassSet = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTheme', () => {
  it('без сохранённого выбора — «как в системе» и тема системы', async () => {
    mockSystemScheme(true)
    const { mode, resolved } = (await loadUseTheme())()

    expect(mode.value).toBe('system')
    expect(resolved.value).toBe('dark')
    expect(isDarkClassSet()).toBe(true)
  })

  it('берёт сохранённый выбор из localStorage', async () => {
    mockSystemScheme(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const { mode, resolved } = (await loadUseTheme())()

    expect(mode.value).toBe('light')
    expect(resolved.value).toBe('light')
    expect(isDarkClassSet()).toBe(false)
  })

  it('игнорирует мусор в localStorage', async () => {
    mockSystemScheme(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    const { mode } = (await loadUseTheme())()

    expect(mode.value).toBe('system')
  })

  it('setMode сохраняет выбор и переключает класс', async () => {
    mockSystemScheme(false)
    const { mode, resolved, setMode } = (await loadUseTheme())()

    setMode('dark')
    expect(mode.value).toBe('dark')
    expect(resolved.value).toBe('dark')
    expect(isDarkClassSet()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    setMode('system')
    expect(resolved.value).toBe('light')
    expect(isDarkClassSet()).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('в режиме «как в системе» следит за prefers-color-scheme', async () => {
    const setSystemDark = mockSystemScheme(false)
    const { resolved } = (await loadUseTheme())()

    setSystemDark(true)
    expect(resolved.value).toBe('dark')
    expect(isDarkClassSet()).toBe(true)
  })

  it('явный выбор не меняется вслед за системой', async () => {
    const setSystemDark = mockSystemScheme(false)
    const { resolved, setMode } = (await loadUseTheme())()

    setMode('light')
    setSystemDark(true)
    expect(resolved.value).toBe('light')
    expect(isDarkClassSet()).toBe(false)
  })

  it('на время смены темы выключает transition и снимает класс следующей задачей', async () => {
    vi.useFakeTimers()
    mockSystemScheme(false)
    const { setMode } = (await loadUseTheme())()
    const classes = document.documentElement.classList

    setMode('dark')
    expect(classes.contains(THEME_SWITCHING_CLASS)).toBe(true)
    vi.runAllTimers()
    expect(classes.contains(THEME_SWITCHING_CLASS)).toBe(false)
    expect(isDarkClassSet()).toBe(true)
    vi.useRealTimers()
  })

  it('без смены темы transition не трогает', async () => {
    mockSystemScheme(true)
    document.documentElement.classList.add('dark') // как после inline-скрипта
    const { setMode } = (await loadUseTheme())()

    setMode('dark')
    expect(document.documentElement.classList.contains(THEME_SWITCHING_CLASS)).toBe(false)
  })

  it('повторный вызов отдаёт то же состояние', async () => {
    mockSystemScheme(false)
    const useTheme = await loadUseTheme()

    useTheme().setMode('dark')
    expect(useTheme().mode.value).toBe('dark')
  })
})
