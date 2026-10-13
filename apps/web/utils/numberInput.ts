import { formatNumber } from '@garage/shared/utils/format'

export interface NumberInputState {
  /** Текст поля с разрядами: `6 800`, `1 250,5` */
  text: string
  /** Число или null, если поле пустое */
  value: number | null
  /** Позиция курсора в `text` */
  caret: number
}

const DECIMAL_SEPARATOR = ','

/** Оставляет только цифры и (если `decimals > 0`) один разделитель с не более чем `decimals` знаками. */
function cleanNumberInput(raw: string, decimals: number) {
  let intDigits = ''
  let fracDigits = ''
  let hasSeparator = false
  for (const char of raw) {
    if (/\d/.test(char)) {
      if (!hasSeparator) intDigits += char
      else if (fracDigits.length < decimals) fracDigits += char
    } else if ((char === ',' || char === '.') && decimals > 0 && !hasSeparator) {
      hasSeparator = true
    }
  }
  intDigits = intDigits.replace(/^0+(?=\d)/, '')
  if (hasSeparator && intDigits === '') intDigits = '0'
  return { intDigits, fracDigits, hasSeparator }
}

/** Сколько значащих символов (цифр и разделителя) в отформатированном тексте */
const countSignificant = (text: string) => text.replace(/[^\d,]/g, '').length

/** Позиция в `text`, после которой стоит `significant` значащих символов */
function caretAfterSignificant(text: string, significant: number): number {
  if (significant <= 0) return 0
  let seen = 0
  for (let index = 0; index < text.length; index++) {
    if (/[\d,]/.test(text[index]!)) seen++
    if (seen === significant) return index + 1
  }
  return text.length
}

function buildText(raw: string, decimals: number) {
  const { intDigits, fracDigits, hasSeparator } = cleanNumberInput(raw, decimals)
  const intText = intDigits === '' ? '' : formatNumber(Number(intDigits))
  return hasSeparator ? `${intText}${DECIMAL_SEPARATOR}${fracDigits}` : intText
}

/**
 * Форматирует набранное в числовом поле с разрядами (`680000` → `680 000`) и переносит
 * курсор так, чтобы он остался после той же цифры.
 */
export function formatNumberInput(raw: string, caret: number, decimals = 0): NumberInputState {
  const text = buildText(raw, decimals)
  const significantBeforeCaret = countSignificant(buildText(raw.slice(0, caret), decimals))
  const normalized = text.replace(/ /g, '').replace(DECIMAL_SEPARATOR, '.')
  return {
    text,
    value: normalized === '' ? null : Number(normalized),
    caret: caretAfterSignificant(text, significantBeforeCaret),
  }
}

/** Значение модели → текст поля (`6800.5` → `6 800,5`) */
export function numberToInputText(value: number | null | undefined, decimals = 0): string {
  if (value == null) return ''
  return buildText(String(value), decimals)
}

/**
 * Backspace/Delete по пробелу-разделителю разрядов удаляет соседнюю цифру — иначе
 * форматирование вернуло бы пробел, и клавиша «не работала» бы.
 */
export function removeDigitAcrossGroupSpace(
  raw: string,
  previousText: string,
  caret: number,
  inputType: string,
): { raw: string; caret: number } {
  const onlySpaceRemoved =
    raw.length === previousText.length - 1 &&
    countSignificant(raw) === countSignificant(previousText)
  if (!onlySpaceRemoved) return { raw, caret }
  if (inputType === 'deleteContentBackward' && caret > 0) {
    return { raw: raw.slice(0, caret - 1) + raw.slice(caret), caret: caret - 1 }
  }
  if (inputType === 'deleteContentForward') {
    return { raw: raw.slice(0, caret) + raw.slice(caret + 1), caret }
  }
  return { raw, caret }
}
