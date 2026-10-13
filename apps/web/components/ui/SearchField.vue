<script setup lang="ts">
import { ref } from 'vue'
import { Search, X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    placeholder?: string
    /** Подпись для скринридера — видимой подписи у поиска нет */
    label?: string
  }>(),
  { placeholder: 'Поиск', label: undefined },
)

const model = defineModel<string>({ default: '' })
const input = ref<HTMLInputElement>()

function clear() {
  model.value = ''
  input.value?.focus()
}
</script>

<template>
  <div
    class="flex h-12 items-center gap-[10px] rounded-md bg-surface-2 px-[14px] focus-within:ring-2 focus-within:ring-focus-ring"
  >
    <Search class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
    <input
      ref="input"
      v-model="model"
      type="search"
      enterkeyhint="search"
      :placeholder="placeholder"
      :aria-label="label ?? placeholder"
      class="ui-search h-full min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-3"
    />
    <button
      v-if="model"
      type="button"
      class="-mr-2 flex h-tap-min w-tap-min shrink-0 items-center justify-center text-text-2"
      aria-label="Очистить поиск"
      @click="clear"
    >
      <X class="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
/* Свой крестик вместо нативного */
.ui-search::-webkit-search-cancel-button {
  appearance: none;
}
</style>
