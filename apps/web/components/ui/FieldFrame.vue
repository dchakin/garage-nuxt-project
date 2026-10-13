<script setup lang="ts">
defineProps<{
  label?: string
  inputId: string
  helperId: string
  hint?: string
  /** Ошибка показывается вместо подсказки */
  error?: string
  /** Счётчик справа под полем («0 / 500») */
  counter?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-text-2">{{ label }}</label>
    <slot />
    <div
      v-if="error || hint || counter"
      class="flex gap-3 text-[0.8125rem] leading-[1.35]"
      :class="error ? 'text-danger-text' : 'text-text-2'"
    >
      <p v-if="error || hint" :id="helperId" class="flex-1" :role="error ? 'alert' : undefined">
        {{ error || hint }}
      </p>
      <p v-if="counter" class="ml-auto shrink-0 text-text-2" aria-hidden="true">{{ counter }}</p>
    </div>
  </div>
</template>
