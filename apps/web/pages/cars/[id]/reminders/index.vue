<script setup lang="ts">
// Файл reminders/index.vue, а не reminders.vue: иначе reminders/new.vue стал бы вложенным маршрутом.
// Новый вид (Г1–Г3) — #60; пока прежний список напоминаний
definePageMeta({ middleware: 'auth', layout: 'car' })

const { car } = useCurrentCar()
</script>

<template>
  <ReminderList v-if="car" :key="car.id" :car-id="car.id" :current-mileage="car.currentMileage" />
</template>
