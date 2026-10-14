import { afterEach, describe, expect, it, vi } from 'vitest'
import { LAST_CAR_STORAGE_KEY, useLastCar } from '~/composables/useLastCar'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useLastCar', () => {
  it('запоминает и читает id машины', () => {
    const { getLastCarId, rememberLastCar } = useLastCar()
    expect(getLastCarId()).toBeNull()
    rememberLastCar(7)
    expect(localStorage.getItem(LAST_CAR_STORAGE_KEY)).toBe('7')
    expect(getLastCarId()).toBe(7)
  })

  it('забывает машину', () => {
    const { getLastCarId, rememberLastCar, forgetLastCar } = useLastCar()
    rememberLastCar(7)
    forgetLastCar()
    expect(getLastCarId()).toBeNull()
  })

  it('мусор в хранилище — null', () => {
    localStorage.setItem(LAST_CAR_STORAGE_KEY, 'abc')
    expect(useLastCar().getLastCarId()).toBeNull()
    localStorage.setItem(LAST_CAR_STORAGE_KEY, '-1')
    expect(useLastCar().getLastCarId()).toBeNull()
  })

  it('недоступное хранилище не роняет приложение', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    })
    const { getLastCarId, rememberLastCar } = useLastCar()
    expect(() => rememberLastCar(7)).not.toThrow()
    expect(getLastCarId()).toBeNull()
  })
})
