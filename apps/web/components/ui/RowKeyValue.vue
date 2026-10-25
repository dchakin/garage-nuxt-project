<script setup lang="ts">
/** Строка «ключ — значение» 56 px без действия; слот заменяет значение (напр. бейджем) */
defineProps<{
  label: string
  value?: string
}>()
</script>

<template>
  <div class="flex h-14 items-center gap-sp-3 bg-surface px-sp-4">
    <span class="min-w-0 flex-1 truncate text-body text-text-2">{{ label }}</span>
    <span class="selectable shrink-0 whitespace-nowrap text-body font-semibold text-text">
      <slot>{{ value }}</slot>
    </span>
  </div>
</template>
