import { describe, expect, it } from 'vitest'
import { formatCarTitle, splitCarsForDeletion } from '~/utils/accountDeletion'

const camry = { id: 1, brand: 'Toyota', model: 'Camry', ownerId: 10 }
const rio = { id: 2, brand: 'Kia', model: 'Rio', ownerId: 10 }
const largus = { id: 3, brand: 'Lada', model: 'Largus', ownerId: 20 }

describe('splitCarsForDeletion', () => {
  it('делит машины на свои и чужие', () => {
    expect(splitCarsForDeletion([camry, rio, largus], 10)).toEqual({
      owned: [camry, rio],
      shared: [largus],
    })
  })

  it('без машин оба списка пусты', () => {
    expect(splitCarsForDeletion([], 10)).toEqual({ owned: [], shared: [] })
  })

  it('только чужие машины — владения нет', () => {
    expect(splitCarsForDeletion([largus], 10)).toEqual({ owned: [], shared: [largus] })
  })
})

describe('formatCarTitle', () => {
  it('склеивает марку и модель', () => {
    expect(formatCarTitle(camry)).toBe('Toyota Camry')
  })
})
