<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

defineProps<{ to: RouteLocationRaw }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-flex items-center gap-1 text-sm text-text-2 hover:text-text transition-colors"
  >
    <ArrowLeft class="h-4 w-4 shrink-0" aria-hidden="true" />
    <slot />
  </NuxtLink>
</template>
