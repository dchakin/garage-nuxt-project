import { describe, expect, it } from 'vitest'
import {
  formatNumberInput,
  numberToInputText,
  removeDigitAcrossGroupSpace,
} from '~/utils/numberInput'

const NBSP = ' '

describe('formatNumberInput', () => {
  it('расставляет разряды', () => {
    expect(formatNumberInput('680000', 6)).toEqual({
      text: `680${NBSP}000`,
      value: 680000,
      caret: 7,
    })
  })

  it('курсор остаётся после той же цифры', () => {
    // «6 800» → вставили 0 после 6: «60 800», курсор после второй цифры
    const state = formatNumberInput(`60${NBSP}800`, 2)
    expect(state.text).toBe(`60${NBSP}800`)
    expect(state.caret).toBe(2)
    // «68 000» + 0 после 8 → «680 000», курсор после «680»
    expect(formatNumberInput(`680${NBSP}000`, 3).caret).toBe(3)
    expect(formatNumberInput(`6800${NBSP}0`, 4)).toMatchObject({ text: `68${NBSP}000`, caret: 5 })
  })

  it('выбрасывает буквы и ведущие нули', () => {
    expect(formatNumberInput('00a12', 5)).toMatchObject({ text: '12', value: 12 })
  })

  it('пустое поле — null', () => {
    expect(formatNumberInput('', 0)).toEqual({ text: '', value: null, caret: 0 })
  })

  it('копейки: одна запятая, не больше двух знаков, точка → запятая', () => {
    expect(formatNumberInput('1250.567', 8, 2)).toMatchObject({
      text: `1${NBSP}250,56`,
      value: 1250.56,
    })
    expect(formatNumberInput('1250,', 5, 2)).toMatchObject({ text: `1${NBSP}250,`, value: 1250 })
    expect(formatNumberInput(',5', 2, 2)).toMatchObject({ text: '0,5', value: 0.5 })
  })

  it('без копеек разделитель игнорируется', () => {
    expect(formatNumberInput('12,5', 4)).toMatchObject({ text: '125', value: 125 })
  })
})

describe('numberToInputText', () => {
  it('модель → текст поля', () => {
    expect(numberToInputText(6800.5, 2)).toBe(`6${NBSP}800,5`)
    expect(numberToInputText(null)).toBe('')
  })
})

describe('removeDigitAcrossGroupSpace', () => {
  it('Backspace после пробела удаляет цифру перед ним', () => {
    // «680 000», курсор после пробела, Backspace удалил пробел → «680000», курсор 3
    expect(
      removeDigitAcrossGroupSpace('680000', `680${NBSP}000`, 3, 'deleteContentBackward'),
    ).toEqual({ raw: '68000', caret: 2 })
  })

  it('Delete перед пробелом удаляет цифру после него', () => {
    expect(
      removeDigitAcrossGroupSpace('680000', `680${NBSP}000`, 3, 'deleteContentForward'),
    ).toEqual({ raw: '68000', caret: 3 })
  })

  it('обычное удаление цифры не трогает', () => {
    expect(
      removeDigitAcrossGroupSpace(`68${NBSP}000`, `680${NBSP}000`, 2, 'deleteContentBackward'),
    ).toEqual({ raw: `68${NBSP}000`, caret: 2 })
  })
})
