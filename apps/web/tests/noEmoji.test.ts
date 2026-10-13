// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findMatchingLines, listWebSourceFiles } from './helpers/sourceFiles'

// Иконки — только компоненты lucide-vue-next (#33): эмодзи в исходниках клиента запрещены.
// Extended_Pictographic ловит и «текстовые» символы-эмодзи (⏰, ⚠, ⛔), но не стрелки и валюту.
const EMOJI_PATTERN = /[\p{Extended_Pictographic}\u{FE0F}]/u

describe('эмодзи в apps/web', () => {
  it('шаблон ловит эмодзи и пропускает обычные символы', () => {
    for (const emoji of ['🚗', '⏰', '⚠️', '⛔', '🔧']) expect(emoji).toMatch(EMOJI_PATTERN)
    for (const text of ['Поделиться → На экран', '6 800 ₽', '87 450 км', '«Домой» — да'])
      expect(text).not.toMatch(EMOJI_PATTERN)
  })

  it('нет в исходниках клиента', () => {
    const files = listWebSourceFiles()
    expect(files.length).toBeGreaterThan(10)
    expect(files.flatMap((file) => findMatchingLines(file, EMOJI_PATTERN))).toEqual([])
  })
})
