import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Исходники клиента для тестов-проверок по тексту (эмодзи, ручное форматирование)
export const WEB_ROOT = fileURLToPath(new URL('../..', import.meta.url))
// Синхронное чтение всех исходников под нагрузкой полного прогона (десятки happy-dom окружений) не укладывается в 5 с
export const SOURCE_SCAN_TIMEOUT_MS = 30_000
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

export function listWebSourceFiles(): string[] {
  return [
    ...SOURCE_DIRS.flatMap((dir) => collectSourceFiles(join(WEB_ROOT, dir))),
    ...SOURCE_FILES.map((file) => join(WEB_ROOT, file)),
  ]
}

/** Строки файла, совпавшие с `pattern`, в виде `путь:строка: текст`. */
export function findMatchingLines(file: string, pattern: RegExp): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      pattern.test(line) ? [`${relative(WEB_ROOT, file)}:${index + 1}: ${line.trim()}`] : [],
    )
}
