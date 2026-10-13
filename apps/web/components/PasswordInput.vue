<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

defineProps<{
  modelValue: string
  minlength?: number
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const visible = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      required
      :minlength="minlength"
      class="input pr-10"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      tabindex="-1"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors"
      :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" class="h-5 w-5" aria-hidden="true" />
      <Eye v-else class="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</template>
