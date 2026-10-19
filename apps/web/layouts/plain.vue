<script setup lang="ts">
/** Экран без шапки и нижней панели: заголовок (`UiAppBar variant="back"`) страница рисует сама. */
</script>

<template>
  <div class="min-h-screen bg-bg pb-sp-6">
    <main class="mx-auto max-w-3xl">
      <slot />
    </main>
  </div>
</template>
