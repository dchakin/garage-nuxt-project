<script setup lang="ts">
import { computed } from 'vue'

/** Больше — «99+» */
const MAX_VISIBLE_COUNT = 99

const props = defineProps<{
  /** Просрочено + скоро; при 0 счётчик не показывается */
  count: number
}>()

const text = computed(() =>
  props.count > MAX_VISIBLE_COUNT ? `${MAX_VISIBLE_COUNT}+` : String(props.count),
)
</script>

<template>
  <span
    v-if="count > 0"
    class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-2xs font-bold text-on-danger"
  >
    {{ text }}
  </span>
</template>
