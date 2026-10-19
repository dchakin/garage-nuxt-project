<script setup lang="ts">
// Форму заменила шторка `EntrySheet` («＋» в панели). Файл подлежит удалению; пока — редирект
// для старых ссылок.
definePageMeta({ middleware: 'auth', redirect: (to) => `/cars/${to.params.id}/journal` })
</script>

<template>
  <div />
</template>
