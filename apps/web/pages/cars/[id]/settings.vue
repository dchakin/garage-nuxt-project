<script setup lang="ts">
// Экран «Настройки машины» — этап 10 (заменит edit.vue); пока ведёт на прежнюю форму
definePageMeta({ middleware: 'auth', layout: 'default' })

const route = useRoute()
await navigateTo(`/cars/${route.params.id}/edit`, { replace: true })
</script>

<template>
  <div />
</template>
