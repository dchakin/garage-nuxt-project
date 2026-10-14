import { describe, expect, it } from 'vitest'
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth'
import { carSchema, inviteSchema } from '../schemas/car'
import { entrySchema, entryFilterSchema } from '../schemas/entry'
import { reminderSchema, reminderFilterSchema } from '../schemas/reminder'

describe('auth schemas', () => {
  it('registerSchema принимает валидные данные', () => {
    const result = registerSchema.parse({ email: 'a@b.com', password: '123456', name: 'Дима' })
    expect(result.email).toBe('a@b.com')
  })

  it('registerSchema отклоняет короткий пароль и некорректный email', () => {
    expect(() => registerSchema.parse({ email: 'x', password: '123', name: 'Дима' })).toThrow()
    expect(() =>
      registerSchema.parse({ email: 'a@b.com', password: '123', name: 'Дима' }),
    ).toThrow()
  })

  it('loginSchema требует непустой пароль', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow()
  })
})

describe('carSchema', () => {
  it('подставляет currentMileage=0 по умолчанию', () => {
    const result = carSchema.parse({ brand: 'Toyota', model: 'Corolla' })
    expect(result.currentMileage).toBe(0)
  })

  it('отклоняет пустую марку', () => {
    expect(() => carSchema.parse({ brand: '', model: 'Corolla' })).toThrow()
  })

  it('допускает пустую строку в photoUrl', () => {
    const result = carSchema.parse({ brand: 'Toyota', model: 'Corolla', photoUrl: '' })
    expect(result.photoUrl).toBe('')
  })

  it('inviteSchema требует валидный email', () => {
    expect(() => inviteSchema.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('entrySchema', () => {
  it('подставляет значения по умолчанию (description, currency)', () => {
    const result = entrySchema.parse({ date: '2026-01-01', type: 'repair' })
    expect(result.description).toBe('')
    expect(result.currency).toBe('RUB')
  })

  it('отклоняет неизвестный тип записи', () => {
    expect(() => entrySchema.parse({ date: '2026-01-01', type: 'unknown' })).toThrow()
  })

  it('отклоняет отрицательный пробег и стоимость', () => {
    expect(() => entrySchema.parse({ date: '2026-01-01', type: 'repair', mileage: -1 })).toThrow()
    expect(() => entrySchema.parse({ date: '2026-01-01', type: 'repair', cost: -1 })).toThrow()
  })

  it('entryFilterSchema по умолчанию сортирует по дате в убывающем порядке', () => {
    const result = entryFilterSchema.parse({})
    expect(result.sortBy).toBe('date')
    expect(result.sortDir).toBe('desc')
  })

  it('entryFilterSchema приводит categoryId из query-строки к числу', () => {
    const result = entryFilterSchema.parse({ categoryId: '3' })
    expect(result.categoryId).toBe(3)
  })
})

describe('reminderSchema', () => {
  it('требует хотя бы одно условие: интервал или срок', () => {
    expect(() => reminderSchema.parse({ title: 'Замена масла' })).toThrow()
  })

  it('принимает nextDueDate без интервала', () => {
    const result = reminderSchema.parse({ title: 'Замена масла', nextDueDate: '2026-06-01' })
    expect(result.nextDueDate).toBe('2026-06-01')
  })

  it('принимает только интервал в км и не пропускает triggerType во вход', () => {
    const result = reminderSchema.parse({ title: 'Масло', intervalKm: 10000, triggerType: 'date' })
    expect(result).not.toHaveProperty('triggerType')
    expect(result.isActive).toBe(true)
  })

  it('reminderFilterSchema приводит isActive из строки query к boolean', () => {
    expect(reminderFilterSchema.parse({ isActive: 'true' }).isActive).toBe(true)
    expect(reminderFilterSchema.parse({}).isActive).toBeUndefined()
  })
})

describe('authMode', () => {
  it('login/register по умолчанию работают в cookie-режиме', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x' }).authMode).toBe('cookie')
    expect(
      registerSchema.parse({ email: 'a@b.com', password: '123456', name: 'Дима' }).authMode,
    ).toBe('cookie')
  })

  it('принимает token и отклоняет неизвестный режим', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x', authMode: 'token' }).authMode).toBe(
      'token',
    )
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'x', authMode: 'jwt' })).toThrow()
  })

  it('refreshSchema требует непустой refresh-токен', () => {
    expect(() => refreshSchema.parse({ refreshToken: '' })).toThrow()
    expect(refreshSchema.parse({ refreshToken: 'abc' }).refreshToken).toBe('abc')
  })
})
