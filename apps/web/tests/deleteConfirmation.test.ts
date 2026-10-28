import { describe, expect, it } from 'vitest'
import { describeEntryDeletion, describeReminderDeletion } from '../utils/deleteConfirmation'

describe('describeEntryDeletion', () => {
  it('называет запись по описанию', () => {
    expect(describeEntryDeletion({ description: ' Замена масла ', type: 'maintenance' })).toBe(
      'Запись «Замена масла» пропадёт из журнала, а её сумма — из расходов.',
    )
  })

  it('без описания берёт название типа', () => {
    expect(describeEntryDeletion({ description: '  ', type: 'repair' })).toContain('«Ремонт»')
  })
})

describe('describeReminderDeletion', () => {
  it('называет напоминание по названию', () => {
    expect(describeReminderDeletion({ title: 'ОСАГО' })).toBe(
      'Напоминание «ОСАГО» исчезнет, push по нему приходить не будут.',
    )
  })
})
