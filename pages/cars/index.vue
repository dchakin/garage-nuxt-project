<script setup lang="ts">
import type { CarInput } from '~~/shared/schemas/car'

definePageMeta({ middleware: 'auth' })

const { cars, loading, saving, fetchCars, createCar } = useCars()
const showForm = ref(false)
const error = ref('')

await fetchCars()

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
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-semibold text-slate-800">Мои автомобили</h1>
      <button class="btn-primary px-3 py-1.5 text-sm" @click="showForm = !showForm">
        {{ showForm ? 'Отмена' : '+ Добавить авто' }}
      </button>
    </div>

    <div v-if="showForm" class="card p-4 mb-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <CarForm :saving="saving" @submit="onCreate" @cancel="showForm = false" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-slate-500">
      <Spinner size="md" />
    </div>

    <div v-else-if="!cars.length" class="card p-8 text-center">
      <div class="text-3xl mb-2">🚗</div>
      <p class="text-slate-500 text-sm">
        Пока нет ни одного автомобиля. Добавьте первый, чтобы начать вести журнал.
      </p>
    </div>

    <div v-else class="grid gap-3">
      <NuxtLink
        v-for="car in cars"
        :key="car.id"
        :to="`/cars/${car.id}`"
        class="card p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition"
      >
        <div>
          <p class="font-medium text-slate-800">{{ car.brand }} {{ car.model }} <span v-if="car.year">({{ car.year }})</span></p>
          <p class="text-sm text-slate-500">{{ car.plateNumber || 'Без номера' }} · {{ car.currentMileage.toLocaleString('ru-RU') }} км</p>
        </div>
        <svg class="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
