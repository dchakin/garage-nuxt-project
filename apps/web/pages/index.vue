<script setup lang="ts">
import { carTabPath } from '~/utils/carTabs'

// `/` открывает «Обзор» последней машины, если она ещё доступна, иначе список машин
definePageMeta({ middleware: 'auth' })

const { cars, fetchCars } = useCars()
const { getLastCarId, forgetLastCar } = useLastCar()

const lastCarId = getLastCarId()
if (lastCarId) await fetchCars()

if (lastCarId && cars.value.some((car) => car.id === lastCarId)) {
  await navigateTo(carTabPath(lastCarId, 'overview'), { replace: true })
} else {
  if (lastCarId) forgetLastCar()
  await navigateTo('/cars', { replace: true })
}
</script>

<template>
  <div />
</template>
