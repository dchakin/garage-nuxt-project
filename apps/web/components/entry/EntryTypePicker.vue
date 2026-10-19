<script setup lang="ts">
/** Выбор типа записи: пять плиток `UiTypeOption` в одной radiogroup, ошибка — под плитками. */
import { entryTypes, type EntryType } from '@garage/shared/schemas/entry'
import { CircleAlert } from 'lucide-vue-next'
import UiTypeOption from '~/components/ui/TypeOption.vue'

defineProps<{ error?: string }>()

const model = defineModel<EntryType | null>({ default: null })
</script>

<template>
  <div>
    <div role="radiogroup" aria-label="Тип записи" class="grid grid-cols-5 gap-sp-2">
      <UiTypeOption v-for="type in entryTypes" :key="type" v-model="model" :type="type" />
    </div>
    <p
      v-if="error"
      class="mt-sp-2 flex items-center gap-sp-1 text-sm text-danger-text"
      role="alert"
    >
      <CircleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
