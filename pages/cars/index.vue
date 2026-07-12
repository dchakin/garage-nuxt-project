<script setup lang="ts">
import type { CarInput } from '~~/shared/schemas/car'

definePageMeta({ middleware: 'auth' })

const { cars, loading, fetchCars, createCar } = useCars()
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
      <button class="text-sm rounded-lg bg-slate-800 text-white px-3 py-1.5" @click="showForm = !showForm">
        {{ showForm ? 'Отмена' : '+ Добавить авто' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <p v-if="error" class="text-sm text-red-600 mb-2">{{ error }}</p>
      <CarForm @submit="onCreate" @cancel="showForm = false" />
    </div>

    <p v-if="loading" class="text-slate-500 text-sm">Загрузка...</p>

    <p v-else-if="!cars.length" class="text-slate-500 text-sm">
      Пока нет ни одного автомобиля. Добавьте первый, чтобы начать вести журнал.
    </p>

    <div v-else class="grid gap-3">
      <NuxtLink
        v-for="car in cars"
        :key="car.id"
        :to="`/cars/${car.id}`"
        class="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-slate-800">{{ car.brand }} {{ car.model }} <span v-if="car.year">({{ car.year }})</span></p>
            <p class="text-sm text-slate-500">{{ car.plateNumber || 'Без номера' }} · {{ car.currentMileage.toLocaleString('ru-RU') }} км</p>
          </div>
          <span class="text-slate-400">→</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
