<script setup lang="ts">
// Правку записи заменила шторка `EntryDetailSheet` (тап по строке). Файл подлежит удалению;
// пока — редирект для старых ссылок.
definePageMeta({ middleware: 'auth', redirect: (to) => `/cars/${to.params.id}/journal` })
</script>

<template>
  <div />
</template>
