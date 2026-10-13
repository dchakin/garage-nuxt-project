// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Иконки — только компоненты lucide-vue-next (#33): эмодзи в исходниках клиента запрещены.
// Extended_Pictographic ловит и «текстовые» символы-эмодзи (⏰, ⚠, ⛔), но не стрелки и валюту.
const EMOJI_PATTERN = /[\p{Extended_Pictographic}\u{FE0F}]/u

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_DIRS = [
  'assets',
  'components',
  'composables',
  'layouts',
  'middleware',
  'pages',
  'plugins',
  'service-worker',
  'theme',
  'utils',
]
const SOURCE_FILES = ['app.vue', 'error.vue', 'nuxt.config.ts']
const SOURCE_EXTENSIONS = new Set(['.vue', '.ts', '.css'])

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const path = join(dir, dirent.name)
    if (dirent.isDirectory()) return collectSourceFiles(path)
    return SOURCE_EXTENSIONS.has(extname(dirent.name)) ? [path] : []
  })
}

function findEmojiLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      EMOJI_PATTERN.test(line) ? [`${relative(WEB_ROOT, file)}:${index + 1}: ${line.trim()}`] : [],
    )
}

describe('эмодзи в apps/web', () => {
  it('шаблон ловит эмодзи и пропускает обычные символы', () => {
    for (const emoji of ['🚗', '⏰', '⚠️', '⛔', '🔧']) expect(emoji).toMatch(EMOJI_PATTERN)
    for (const text of ['Поделиться → На экран', '6 800 ₽', '87 450 км', '«Домой» — да'])
      expect(text).not.toMatch(EMOJI_PATTERN)
  })

  it('нет в исходниках клиента', () => {
    const files = [
      ...SOURCE_DIRS.flatMap((dir) => collectSourceFiles(join(WEB_ROOT, dir))),
      ...SOURCE_FILES.map((file) => join(WEB_ROOT, file)),
    ]
    expect(files.length).toBeGreaterThan(10)
    expect(files.flatMap(findEmojiLines)).toEqual([])
  })
})
