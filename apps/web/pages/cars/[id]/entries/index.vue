<script setup lang="ts">
// Старый URL журнала — редирект на вкладку «Журнал»
definePageMeta({ middleware: 'auth' })

const route = useRoute()
await navigateTo(`/cars/${route.params.id}/journal`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
