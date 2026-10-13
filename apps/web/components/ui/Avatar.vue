<script setup lang="ts">
import { computed } from 'vue'

/** Декоративный (aria-hidden): имя всегда написано рядом */
const props = defineProps<{
  /** Имя или email — на аватаре первая буква */
  name: string
}>()

const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <span
    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>
