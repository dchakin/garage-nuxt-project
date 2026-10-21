<script setup lang="ts">
/**
 * Мастер первого запуска (А4–А6) — задача #72. Пока мастера нет, регистрация приводит сюда,
 * а страница ведёт на список машин; #72 заменяет её содержимое.
 */
definePageMeta({ middleware: 'auth' })

await navigateTo('/cars', { replace: true })
</script>

<template>
  <div />
</template>
