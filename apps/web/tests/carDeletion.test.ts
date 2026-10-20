import { describe, expect, it } from 'vitest'
import { describeCarDeletion } from '~/utils/carDeletion'

describe('describeCarDeletion', () => {
  it('перечисляет записи, напоминания и участника', () => {
    expect(describeCarDeletion({ entriesCount: 8, remindersCount: 5, memberNames: ['Анна'] })).toBe(
      'Вместе с машиной удалятся 8 записей и 5 напоминаний. Анна потеряет доступ. Это нельзя отменить.',
    )
  })

  it('склоняет числа и глагол для нескольких участников', () => {
    expect(
      describeCarDeletion({
        entriesCount: 1,
        remindersCount: 2,
        memberNames: ['Анна', 'Сергей', 'Олег'],
      }),
    ).toBe(
      'Вместе с машиной удалятся 1 запись и 2 напоминания. Анна, Сергей и Олег потеряют доступ. Это нельзя отменить.',
    )
  })

  it('без участников не говорит про доступ', () => {
    expect(describeCarDeletion({ entriesCount: 0, remindersCount: 0, memberNames: [] })).toBe(
      'Вместе с машиной удалятся 0 записей и 0 напоминаний. Это нельзя отменить.',
    )
  })
})
