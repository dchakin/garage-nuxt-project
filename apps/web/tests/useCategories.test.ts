import { computed, ref, toValue } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CarCategory } from '~/composables/useCategories'

const fetchMock = vi.fn()
const CAR_ID = 7

const standard: CarCategory = {
  id: 1,
  carId: null,
  name: 'Прочее',
  isDefault: true,
  entriesCount: 3,
}
const own: CarCategory = { id: 20, carId: CAR_ID, name: 'Кузов', isDefault: false, entriesCount: 2 }

async function loadComposable() {
  vi.resetModules()
  const state = ref<Record<number, CarCategory[]>>({})
  vi.stubGlobal('useState', () => state)
  const { useCategories } = await import('~/composables/useCategories')
  return useCategories(CAR_ID)
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('toValue', toValue)
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('useCategories', () => {
  it('fetchCategories берёт категории машины и не перезапрашивает кэш без force', async () => {
    const { categories, fetchCategories } = await loadComposable()
    fetchMock.mockResolvedValue([standard, own])

    await fetchCategories()
    await fetchCategories()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`/api/cars/${CAR_ID}/categories`)
    expect(categories.value).toHaveLength(2)

    await fetchCategories(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('createCategory шлёт POST и добавляет категорию в список по имени', async () => {
    const { categories, fetchCategories, createCategory } = await loadComposable()
    fetchMock.mockResolvedValueOnce([standard, own])
    await fetchCategories()

    const created = { ...own, id: 21, name: 'Аксессуары', entriesCount: 0 }
    fetchMock.mockResolvedValueOnce(created)
    await createCategory('Аксессуары')

    expect(fetchMock).toHaveBeenLastCalledWith(`/api/cars/${CAR_ID}/categories`, {
      method: 'POST',
      body: { name: 'Аксессуары' },
    })
    expect(categories.value.map((category) => category.name)).toEqual([
      'Аксессуары',
      'Кузов',
      'Прочее',
    ])
  })

  it('createCategory пробрасывает ошибку и не меняет список', async () => {
    const { categories, fetchCategories, createCategory } = await loadComposable()
    fetchMock.mockResolvedValueOnce([standard])
    await fetchCategories()

    const conflict = { statusCode: 409 }
    fetchMock.mockRejectedValueOnce(conflict)
    await expect(createCategory('Прочее')).rejects.toBe(conflict)
    expect(categories.value).toEqual([standard])
  })

  it('renameCategory меняет имя и сохраняет число записей', async () => {
    const { categories, fetchCategories, renameCategory } = await loadComposable()
    fetchMock.mockResolvedValueOnce([standard, own])
    await fetchCategories()

    fetchMock.mockResolvedValueOnce({ id: own.id, name: 'Кузовные работы' })
    await renameCategory(own.id, 'Кузовные работы')

    expect(fetchMock).toHaveBeenLastCalledWith(`/api/categories/${own.id}`, {
      method: 'PATCH',
      body: { name: 'Кузовные работы' },
    })
    const renamed = categories.value.find((category) => category.id === own.id)
    expect(renamed).toMatchObject({ name: 'Кузовные работы', entriesCount: 2 })
  })

  it('deleteCategory убирает категорию и перечитывает счётчики «Прочее»', async () => {
    const { categories, fetchCategories, deleteCategory } = await loadComposable()
    fetchMock.mockResolvedValueOnce([standard, own])
    await fetchCategories()

    fetchMock.mockResolvedValueOnce({ ok: true })
    fetchMock.mockResolvedValueOnce([{ ...standard, entriesCount: 5 }])
    await deleteCategory(own.id)

    expect(fetchMock).toHaveBeenCalledWith(`/api/categories/${own.id}`, { method: 'DELETE' })
    expect(categories.value).toEqual([{ ...standard, entriesCount: 5 }])
  })

  it('deleteCategory не падает, если перечитать список не удалось', async () => {
    const { categories, fetchCategories, deleteCategory } = await loadComposable()
    fetchMock.mockResolvedValueOnce([standard, own])
    await fetchCategories()

    fetchMock.mockResolvedValueOnce({ ok: true })
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await deleteCategory(own.id)

    expect(categories.value).toEqual([standard])
  })
})
