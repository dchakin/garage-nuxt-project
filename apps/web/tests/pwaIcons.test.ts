// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Логотип (#75): `public/logo.svg` — экспорт `Logo / App Icon`, PNG-иконки из него генерирует
// `npm run pwa-assets` (часть `npm run build`), а `nuxt.config.ts` на них ссылается.
const WEB_ROOT = resolve(__dirname, '..')
const BRAND_COLOR = '#2648E0'
const OLD_BRAND_COLOR = '#4f46e5'

const readWebFile = (path: string) => readFileSync(resolve(WEB_ROOT, path), 'utf8')

describe('логотип и PWA-иконки', () => {
  it('logo.svg — плитка нового логотипа без прежнего индиго', () => {
    const logo = readWebFile('public/logo.svg')
    expect(logo).toContain(BRAND_COLOR)
    expect(logo.toLowerCase()).not.toContain(OLD_BRAND_COLOR)
  })

  it('каждая иконка из nuxt.config.ts лежит в public', () => {
    const config = readWebFile('nuxt.config.ts')
    const icons = [...config.matchAll(/(?:src|href): '\/?([\w-]+\.(?:png|ico|svg))'/g)].map(
      (match) => match[1],
    )
    expect(icons).toEqual(
      expect.arrayContaining([
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon-180x180.png',
        'favicon.ico',
        'logo.svg',
      ]),
    )
    for (const icon of icons) expect(existsSync(resolve(WEB_ROOT, 'public', icon)), icon).toBe(true)
  })

  it('сборка сначала пересобирает иконки', () => {
    const { scripts } = JSON.parse(readWebFile('package.json')) as {
      scripts: Record<string, string>
    }
    expect(scripts['pwa-assets']).toBe('pwa-assets-generator')
    expect(scripts.build).toMatch(/^npm run pwa-assets && /)
  })
})
