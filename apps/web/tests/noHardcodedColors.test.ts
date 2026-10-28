// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { relative } from 'node:path'
import {
  findMatchingLines,
  listWebSourceFiles,
  SOURCE_SCAN_TIMEOUT_MS,
  WEB_ROOT,
} from './helpers/sourceFiles'

// Цвета — только токены (#33, assets/css/tokens.css): ни hex, ни rgb()/hsl(, ни палитра Tailwind.
const TOKENS_FILE = 'assets/css/tokens.css'

const TAILWIND_PALETTES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]
const COLOR_UTILITIES = [
  'bg',
  'text',
  'border',
  'ring',
  'fill',
  'stroke',
  'from',
  'to',
  'via',
  'divide',
  'outline',
  'shadow',
  'decoration',
  'accent',
  'caret',
]

const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i
const TAILWIND_PALETTE_CLASS = new RegExp(`\\b(?:${TAILWIND_PALETTES.join('|')})-\\d{2,3}\\b`)
const PLAIN_COLOR_CLASS = new RegExp(`\\b(?:${COLOR_UTILITIES.join('|')})-(?:white|black)\\b`)
const NAMED_CSS_COLOR =
  /\b(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*(?:white|black|red|green|blue|gray|grey)\b/

const COLOR_PATTERNS = {
  'hex-цвет': HEX_COLOR,
  'rgb()/hsl()': FUNCTIONAL_COLOR,
  'палитра Tailwind': TAILWIND_PALETTE_CLASS,
  'white/black Tailwind': PLAIN_COLOR_CLASS,
  'именованный цвет CSS': NAMED_CSS_COLOR,
}

function isTokensFile(file: string): boolean {
  return relative(WEB_ROOT, file).replaceAll('\\', '/') === TOKENS_FILE
}

describe('хардкод цветов в apps/web', () => {
  it('шаблоны ловят хардкод и пропускают токены', () => {
    const bad: Record<string, string[]> = {
      'hex-цвет': ['color: #fff', 'fill="#2648E0"', 'bg-[#12345678]'],
      'rgb()/hsl()': ['rgb(0 0 0)', 'background: rgba(0, 0, 0, 0.5)', 'hsl(210 40% 90%)'],
      'палитра Tailwind': ['bg-slate-100', 'text-indigo-600', 'border-red-500/50'],
      'white/black Tailwind': ['text-white', 'bg-black'],
      'именованный цвет CSS': ['color: red', 'background: white'],
    }
    for (const [name, samples] of Object.entries(bad)) {
      const pattern = COLOR_PATTERNS[name as keyof typeof COLOR_PATTERNS]
      for (const sample of samples) expect(sample, name).toMatch(pattern)
    }

    const good = [
      'bg-surface text-text-2 border-border',
      'color: var(--accent)',
      'text-on-accent bg-accent-soft',
      '<a href="#main">',
      'text-h1 h-12 w-12 p-4',
    ]
    for (const sample of good)
      for (const pattern of Object.values(COLOR_PATTERNS)) expect(sample).not.toMatch(pattern)
  })

  it(
    'нет в исходниках клиента вне tokens.css',
    () => {
      const files = listWebSourceFiles()
      expect(files.some(isTokensFile)).toBe(true)

      const offenders = files
        .filter((file) => !isTokensFile(file))
        .flatMap((file) =>
          Object.entries(COLOR_PATTERNS).flatMap(([name, pattern]) =>
            findMatchingLines(file, pattern).map((line) => `${name} — ${line}`),
          ),
        )
      expect(offenders).toEqual([])
    },
    SOURCE_SCAN_TIMEOUT_MS,
  )
})
