<script setup lang="ts">
/**
 * Экраны входа и восстановления пароля (А1–А3, А7–А9): на всю высоту окна, без шапки и панели.
 * Страница делает форму `flex flex-1 flex-col`, а главное действие кладёт в нижний блок
 * `mt-auto` — оно оказывается прибитым к низу экрана.
 */
</script>

<template>
  <div
    class="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-sp-5 pt-sp-10 pb-[calc(var(--sp-6)+env(safe-area-inset-bottom))]"
  >
    <slot />
  </div>
</template>
