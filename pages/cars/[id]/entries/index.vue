<script setup lang="ts">
// Журнал встроен в страницу авто — старый URL редиректит туда
definePageMeta({ middleware: 'auth' })

const route = useRoute()
await navigateTo(`/cars/${route.params.id}`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
