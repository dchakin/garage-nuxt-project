<script setup lang="ts">
import { CarFront, Plus } from 'lucide-vue-next'
import type { CarInput } from '@garage/shared/schemas/car'

definePageMeta({ middleware: 'auth' })

const { cars, loading, saving, fetchCars, createCar } = useCars()
const { statusCounts, loadAllStatusCounts } = useCarStatusCounts()
const showForm = ref(false)
const error = ref('')

await fetchCars()
// Бейджи статусов подгружаются после списка и не задерживают экран
loadAllStatusCounts(cars.value)

async function onCreate(input: CarInput) {
  error.value = ''
  try {
    const car = await createCar(input)
    showForm.value = false
    await navigateTo(`/cars/${car.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось добавить автомобиль'
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
      <h1 class="text-h1 text-text">Мои автомобили</h1>
      <UiButton
        :variant="showForm ? 'secondary' : 'primary'"
        size="sm"
        :icon="showForm ? undefined : Plus"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Отмена' : 'Добавить авто' }}
      </UiButton>
    </div>

    <div v-if="showForm" class="card p-4 mb-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <CarForm :saving="saving" @submit="onCreate" @cancel="showForm = false" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-text-2">
      <UiSpinner size="md" />
    </div>

    <div v-else-if="!cars.length" class="card p-8 text-center">
      <CarFront class="mx-auto mb-2 h-7 w-7 text-text-3" aria-hidden="true" />
      <p class="text-text-2 text-sm">
        Пока нет ни одного автомобиля. Добавьте первый, чтобы начать вести журнал.
      </p>
    </div>

    <ul v-else class="flex flex-col gap-sp-3" aria-label="Машины">
      <li v-for="car in cars" :key="car.id">
        <UiRowCar
          :car="car"
          :overdue-count="statusCounts[car.id]?.overdue"
          :soon-count="statusCounts[car.id]?.soon"
          @select="navigateTo(`/cars/${car.id}`)"
        />
      </li>
    </ul>
  </div>
</template>
