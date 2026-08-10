import type { Category } from '~~/shared/types'

export function useCategories() {
  const categories = useState<Category[]>('categories', () => [])
  // useRequestFetch пробрасывает cookie при SSR (обычный $fetch — нет, что давало 401)
  const requestFetch = useRequestFetch()

  async function fetchCategories() {
    if (categories.value.length) return
    categories.value = await requestFetch<Category[]>('/api/categories')
  }

  return { categories, fetchCategories }
}
