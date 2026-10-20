import type { Category } from '@garage/shared/types'

/** Категория машины с числом записей — как отдаёт `GET /api/cars/[id]/categories` */
export type CarCategory = Category & { entriesCount: number }

/** Стандартные и свои категории одной машины; кэш раздельный по машинам */
export function useCategories(carId: MaybeRefOrGetter<number>) {
  const byCar = useState<Record<number, CarCategory[]>>('categories', () => ({}))
  const categories = computed(() => byCar.value[toValue(carId)] ?? [])

  /** `force` — перечитать после создания, переименования или удаления */
  async function fetchCategories(force = false) {
    const id = toValue(carId)
    if (!id || (!force && byCar.value[id]?.length)) return
    byCar.value = {
      ...byCar.value,
      [id]: await $fetch<CarCategory[]>(`/api/cars/${id}/categories`),
    }
  }

  return { categories, fetchCategories }
}
