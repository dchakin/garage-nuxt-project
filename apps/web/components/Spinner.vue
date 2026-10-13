<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <LoaderCircle
    class="animate-spin"
    :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
    aria-hidden="true"
  />
</template>
