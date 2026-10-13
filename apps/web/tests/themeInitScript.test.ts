import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '~/theme/constants'
import { buildThemeInitScript, readThemeBackgrounds } from '~/theme/initScript'

const BACKGROUNDS = { light: '#f5f4f0', dark: '#0f0f0e' }

function runInitScript(systemDark: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: systemDark }))
  new Function(buildThemeInitScript(BACKGROUNDS))()
}

const themeColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.head.innerHTML = '<meta name="theme-color" content="#000000">'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('inline-скрипт темы', () => {
  it('без выбора следует системе', () => {
    runInitScript(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(themeColor()).toBe(BACKGROUNDS.dark)
  })

  it('сохранённая «Светлая» сильнее тёмной системы', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    runInitScript(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(themeColor()).toBe(BACKGROUNDS.light)
  })

  it('сохранённая «Тёмная» сильнее светлой системы', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    runInitScript(false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(themeColor()).toBe(BACKGROUNDS.dark)
  })

  it('создаёт meta theme-color, если её нет', () => {
    document.head.innerHTML = ''
    runInitScript(false)
    expect(themeColor()).toBe(BACKGROUNDS.light)
  })
})

describe('readThemeBackgrounds', () => {
  it('читает --bg обеих тем из tokens.css', () => {
    const tokensCss = readFileSync(path.resolve(__dirname, '../assets/css/tokens.css'), 'utf8')
    expect(readThemeBackgrounds(tokensCss)).toEqual(BACKGROUNDS)
  })

  it('падает, если токена нет', () => {
    expect(() => readThemeBackgrounds(':root { --surface: #fff; }')).toThrow(/--bg/)
  })
})
