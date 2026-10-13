// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findMatchingLines, listWebSourceFiles } from './helpers/sourceFiles'

// Даты, суммы и пробег выводятся только через @garage/shared/utils/format (#34)
const MANUAL_FORMATTING_PATTERN = /toLocale(?:Date|Time)?String|Intl\.|\}\}?\s*(?:км|₽)/

describe('ручное форматирование в apps/web', () => {
  it('шаблон ловит toLocaleString, Intl и единицы после интерполяции', () => {
    for (const code of [
      "cost.toLocaleString('ru-RU')",
      'date.toLocaleDateString()',
      'new Intl.NumberFormat()',
      '{{ car.currentMileage }} км',
      '`${cost} ₽`',
    ])
      expect(code).toMatch(MANUAL_FORMATTING_PATTERN)
    for (const code of ['{{ formatMileage(car.currentMileage) }}', 'Пробег, км'])
      expect(code).not.toMatch(MANUAL_FORMATTING_PATTERN)
  })

  it('нет в исходниках клиента', () => {
    const files = listWebSourceFiles()
    expect(files.flatMap((file) => findMatchingLines(file, MANUAL_FORMATTING_PATTERN))).toEqual([])
  })
})
