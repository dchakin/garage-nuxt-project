import { describe, expect, it } from 'vitest'
import { registerSchema, loginSchema } from '../../shared/schemas/auth'
import { carSchema, inviteSchema } from '../../shared/schemas/car'
import { entrySchema, entryFilterSchema } from '../../shared/schemas/entry'
import { reminderSchema, reminderFilterSchema } from '../../shared/schemas/reminder'

describe('auth schemas', () => {
  it('registerSchema принимает валидные данные', () => {
    const result = registerSchema.parse({ email: 'a@b.com', password: '123456', name: 'Дима' })
    expect(result.email).toBe('a@b.com')
  })

  it('registerSchema отклоняет короткий пароль и некорректный email', () => {
    expect(() => registerSchema.parse({ email: 'x', password: '123', name: 'Дима' })).toThrow()
    expect(() => registerSchema.parse({ email: 'a@b.com', password: '123', name: 'Дима' })).toThrow()
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
  it('требует интервал в месяцах или дату для triggerType=date', () => {
    expect(() => reminderSchema.parse({ title: 'Замена масла', triggerType: 'date' })).toThrow()
  })

  it('принимает triggerType=date с nextDueDate без интервала', () => {
    const result = reminderSchema.parse({ title: 'Замена масла', triggerType: 'date', nextDueDate: '2026-06-01' })
    expect(result.nextDueDate).toBe('2026-06-01')
  })

  it('требует интервал в км или пробег для triggerType=mileage', () => {
    expect(() => reminderSchema.parse({ title: 'Замена масла', triggerType: 'mileage' })).toThrow()
  })

  it('both требует оба условия одновременно', () => {
    expect(() =>
      reminderSchema.parse({ title: 'ТО', triggerType: 'both', intervalMonths: 6 })
    ).toThrow()
    const result = reminderSchema.parse({
      title: 'ТО',
      triggerType: 'both',
      intervalMonths: 6,
      intervalKm: 10000
    })
    expect(result.isActive).toBe(true)
  })

  it('reminderFilterSchema приводит isActive из строки query к boolean', () => {
    expect(reminderFilterSchema.parse({ isActive: 'true' }).isActive).toBe(true)
    expect(reminderFilterSchema.parse({}).isActive).toBeUndefined()
  })
})
