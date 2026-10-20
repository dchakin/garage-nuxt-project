import type { Car, CarDetail } from '@garage/shared/types'
import type { CarInput, CarMileageInput } from '@garage/shared/schemas/car'

export function useCars() {
  const cars = useState<Car[]>('cars', () => [])
  const loading = ref(false)
  const saving = ref(false)
  const deletingId = ref<number | null>(null)
  const leavingId = ref<number | null>(null)

  async function fetchCars() {
    loading.value = true
    try {
      cars.value = await $fetch<Car[]>('/api/cars')
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

  /** Обновить пробег (`PATCH …/mileage`); уменьшение требует `confirmDecrease: true` */
  async function updateMileage(id: number, input: CarMileageInput) {
    saving.value = true
    try {
      const updated = await $fetch<Car>(`/api/cars/${id}/mileage`, { method: 'PATCH', body: input })
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

  /** Выйти из чужой машины (`DELETE …/members/me`); владелец выйти не может (400) */
  async function leaveCar(id: number) {
    leavingId.value = id
    try {
      await $fetch(`/api/cars/${id}/members/me`, { method: 'DELETE' })
      cars.value = cars.value.filter((c) => c.id !== id)
    } finally {
      leavingId.value = null
    }
  }

  async function fetchCar(id: number) {
    return $fetch<CarDetail>(`/api/cars/${id}`)
  }

  return {
    cars,
    loading,
    saving,
    deletingId,
    leavingId,
    fetchCars,
    createCar,
    updateCar,
    updateMileage,
    deleteCar,
    leaveCar,
    fetchCar,
  }
}
