import { describe, expect, it } from 'vitest'
import { describePasswordLength, formatCountdown } from '~/utils/passwordReset'

describe('formatCountdown', () => {
  it('минуты и секунды через двоеточие', () => {
    expect(formatCountdown(45)).toBe('0:45')
    expect(formatCountdown(60)).toBe('1:00')
    expect(formatCountdown(9)).toBe('0:09')
  })

  it('не уходит в минус и округляет вверх', () => {
    expect(formatCountdown(-3)).toBe('0:00')
    expect(formatCountdown(0.2)).toBe('0:01')
  })
})

describe('describePasswordLength', () => {
  it('пустое поле — обычная подсказка', () => {
    expect(describePasswordLength(0)).toEqual({ text: 'Минимум 6 символов', isError: false })
  })

  it('короче минимума — ошибка с остатком', () => {
    expect(describePasswordLength(3)).toEqual({
      text: 'Минимум 6 символов — осталось 3',
      isError: true,
    })
    expect(describePasswordLength(5).text).toBe('Минимум 6 символов — осталось 1')
  })

  it('достаточная длина — снова подсказка', () => {
    expect(describePasswordLength(6)).toEqual({ text: 'Минимум 6 символов', isError: false })
    expect(describePasswordLength(12).isError).toBe(false)
  })
})
