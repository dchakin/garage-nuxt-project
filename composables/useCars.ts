import type { Car, CarDetail } from '~~/shared/types'
import type { CarInput } from '~~/shared/schemas/car'

export function useCars() {
  const cars = useState<Car[]>('cars', () => [])
  const loading = ref(false)

  async function fetchCars() {
    loading.value = true
    try {
      cars.value = await $fetch<Car[]>('/api/cars')
    } finally {
      loading.value = false
    }
  }

  async function createCar(input: CarInput) {
    const car = await $fetch<Car>('/api/cars', { method: 'POST', body: input })
    cars.value = [...cars.value, car]
    return car
  }

  async function updateCar(id: number, input: Partial<CarInput>) {
    const updated = await $fetch<Car>(`/api/cars/${id}`, { method: 'PATCH', body: input })
    cars.value = cars.value.map((c) => (c.id === id ? updated : c))
    return updated
  }

  async function deleteCar(id: number) {
    await $fetch(`/api/cars/${id}`, { method: 'DELETE' })
    cars.value = cars.value.filter((c) => c.id !== id)
  }

  async function fetchCar(id: number) {
    return $fetch<CarDetail>(`/api/cars/${id}`)
  }

  return { cars, loading, fetchCars, createCar, updateCar, deleteCar, fetchCar }
}
