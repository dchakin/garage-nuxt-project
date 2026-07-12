import type { Category } from '~~/shared/types'

export function useCategories() {
  const categories = useState<Category[]>('categories', () => [])

  async function fetchCategories() {
    if (categories.value.length) return
    categories.value = await $fetch<Category[]>('/api/categories')
  }

  return { categories, fetchCategories }
}
