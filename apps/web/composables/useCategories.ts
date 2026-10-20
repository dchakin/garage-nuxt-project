import type { Category } from '@garage/shared/types'

/** Категория машины с числом записей — как отдаёт `GET /api/cars/[id]/categories` */
export type CarCategory = Category & { entriesCount: number }

function sortByName(list: CarCategory[]): CarCategory[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Стандартные и свои категории одной машины; кэш раздельный по машинам */
export function useCategories(carId: MaybeRefOrGetter<number>) {
  const byCar = useState<Record<number, CarCategory[]>>('categories', () => ({}))
  const categories = computed(() => byCar.value[toValue(carId)] ?? [])

  function setCategories(id: number, list: CarCategory[]) {
    byCar.value = { ...byCar.value, [id]: list }
  }

  /** `force` — перечитать после создания, переименования или удаления */
  async function fetchCategories(force = false) {
    const id = toValue(carId)
    if (!id || (!force && byCar.value[id]?.length)) return
    setCategories(id, await $fetch<CarCategory[]>(`/api/cars/${id}/categories`))
  }

  /** Своя категория машины; ошибку (в т.ч. 409 «имя занято») пробрасывает вызывающему */
  async function createCategory(name: string): Promise<CarCategory> {
    const id = toValue(carId)
    const created = await $fetch<CarCategory>(`/api/cars/${id}/categories`, {
      method: 'POST',
      body: { name },
    })
    setCategories(id, sortByName([...(byCar.value[id] ?? []), created]))
    return created
  }

  async function renameCategory(categoryId: number, name: string): Promise<void> {
    const id = toValue(carId)
    const updated = await $fetch<Category>(`/api/categories/${categoryId}`, {
      method: 'PATCH',
      body: { name },
    })
    setCategories(
      id,
      sortByName(
        (byCar.value[id] ?? []).map((category) =>
          category.id === categoryId ? { ...category, name: updated.name } : category,
        ),
      ),
    )
  }

  /** Записи удалённой категории переходят в «Прочее» — счётчики перечитываются с сервера */
  async function deleteCategory(categoryId: number): Promise<void> {
    const id = toValue(carId)
    await $fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
    setCategories(
      id,
      (byCar.value[id] ?? []).filter((category) => category.id !== categoryId),
    )
    await fetchCategories(true).catch(() => {})
  }

  return { categories, fetchCategories, createCategory, renameCategory, deleteCategory }
}
