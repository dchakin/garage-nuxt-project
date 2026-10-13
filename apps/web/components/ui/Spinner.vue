<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    /** sm — 16 px (в строке рядом с текстом), md — 20 px (подгрузка списка) */
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <LoaderCircle
    class="shrink-0 animate-spin"
    :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
    aria-hidden="true"
  />
</template>
