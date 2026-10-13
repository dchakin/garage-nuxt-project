<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Подпись для скринридера, если рядом нет связанного текста (иначе — aria-labelledby) */
    label?: string
    disabled?: boolean
    /** success — в «мостике» запись → напоминание */
    tone?: 'accent' | 'success'
  }>(),
  { label: undefined, tone: 'accent' },
)

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-base ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-40"
    :class="model ? (tone === 'success' ? 'bg-success' : 'bg-accent') : 'bg-border-strong'"
    @click="model = !model"
  >
    <span
      class="h-[26px] w-[26px] rounded-full bg-knob shadow-sm transition-transform duration-base ease-standard motion-reduce:transition-none"
      :class="model ? 'translate-x-5' : 'translate-x-0'"
      aria-hidden="true"
    />
  </button>
</template>
