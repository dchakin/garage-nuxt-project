import { describe, expect, it } from 'vitest'
import { normalizePlateNumber } from '../utils/plate'

describe('normalizePlateNumber', () => {
  it('переводит буквы в верхний регистр, кириллицу тоже', () => {
    expect(normalizePlateNumber('у911рв')).toBe('У911РВ')
    expect(normalizePlateNumber('a123bc 77')).toBe('A123BC 77')
  })

  it('обрезает пробелы по краям и не трогает уже заглавные', () => {
    expect(normalizePlateNumber('  А123ВС 77 ')).toBe('А123ВС 77')
  })
})
