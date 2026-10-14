<script setup lang="ts">
// Новый вид журнала (В1–В7) — этап 7; пока прежний список записей
definePageMeta({ middleware: 'auth', layout: 'car' })

const route = useRoute()
const carId = computed(() => Number(route.params.id))
</script>

<template>
  <EntryJournal :key="carId" :car-id="carId" />
</template>
