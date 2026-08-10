import type { Car, CarDetail } from '~~/shared/types'
import type { CarInput } from '~~/shared/schemas/car'

export function useCars() {
  const cars = useState<Car[]>('cars', () => [])
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref<number | null>(null)
  // useRequestFetch пробрасывает cookie при SSR (обычный $fetch этого не делает,
  // из-за чего /api/cars отвечал 401 при обновлении страницы)
  const requestFetch = useRequestFetch()

  async function fetchCars() {
    loading.value = true
    try {
      cars.value = await requestFetch<Car[]>('/api/cars')
    } finally {
      loading.value = false
    }
  }

  async function createCar(input: CarInput) {
    saving.value = true
    try {
      const car = await $fetch<Car>('/api/cars', { method: 'POST', body: input })
      cars.value = [...cars.value, car]
      return car
    } finally {
      saving.value = false
    }
  }

  async function updateCar(id: number, input: Partial<CarInput>) {
    saving.value = true
    try {
      const updated = await $fetch<Car>(`/api/cars/${id}`, { method: 'PATCH', body: input })
      cars.value = cars.value.map((c) => (c.id === id ? updated : c))
      return updated
    } finally {
      saving.value = false
    }
  }

  async function deleteCar(id: number) {
    deletingId.value = id
    try {
      await $fetch(`/api/cars/${id}`, { method: 'DELETE' })
      cars.value = cars.value.filter((c) => c.id !== id)
    } finally {
      deletingId.value = null
    }
  }

  async function fetchCar(id: number) {
    return requestFetch<CarDetail>(`/api/cars/${id}`)
  }

  return { cars, loading, saving, deletingId, fetchCars, createCar, updateCar, deleteCar, fetchCar }
}
