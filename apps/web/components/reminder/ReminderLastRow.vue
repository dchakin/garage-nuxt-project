<script setup lang="ts">
/**
 * «Последний раз» (Е1/Е2/Е4): строка с `History` — откуда взят отсчёт («Из журнала: 14 фев ·
 * 77 200 км») и ссылка «Другая», раскрывающая поля пробега и даты. Правка полей сообщает
 * родителю `touched`: после неё отсчёт больше не подставляется из журнала автоматически.
 */
import { ref } from 'vue'
import { History } from 'lucide-vue-next'

defineProps<{ text: string }>()
const emit = defineEmits<{ touched: [] }>()

const mileage = defineModel<number | null>('mileage', { required: true })
const date = defineModel<string>('date', { required: true })

const expanded = ref(false)
</script>

<template>
  <div class="flex flex-col gap-sp-2">
    <p class="text-sm text-text-2">Последний раз</p>
    <div
      class="flex items-center gap-sp-3 rounded-md border border-border-strong bg-surface px-sp-4 py-sp-3"
    >
      <History class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
      <p class="min-w-0 flex-1 text-body text-text" data-testid="reminder-last-hint">{{ text }}</p>
      <UiButton variant="text" size="sm" :aria-expanded="expanded" @click="expanded = !expanded">
        Другая
      </UiButton>
    </div>
    <div v-if="expanded" class="grid grid-cols-2 gap-x-sp-3">
      <UiField
        v-model="mileage"
        type="number"
        label="Пробег"
        suffix="км"
        @update:model-value="emit('touched')"
      />
      <UiField
        v-model="date"
        type="date"
        label="Дата"
        pretty-date
        @update:model-value="emit('touched')"
      />
    </div>
  </div>
</template>
