<script setup lang="ts">
/**
 * «Повторять каждые [км] или [мес]» с подсказкой «Сработает то, что наступит раньше»
 * (Е1/Е2/Е4). Ошибку «нет ни одного интервала» показывает форма через `error`.
 */
import { CircleAlert } from 'lucide-vue-next'

defineProps<{ error?: string }>()

const intervalKm = defineModel<number | null>('km', { required: true })
const intervalMonths = defineModel<number | null>('months', { required: true })
</script>

<template>
  <fieldset class="flex flex-col gap-sp-2">
    <legend class="mb-sp-2 text-sm text-text-2">Повторять каждые</legend>
    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-sp-3">
      <UiField
        v-model="intervalKm"
        type="number"
        aria-label="Интервал, километры"
        placeholder="—"
        suffix="км"
      />
      <span class="text-sm text-text-2">или</span>
      <UiField
        v-model="intervalMonths"
        type="number"
        aria-label="Интервал, месяцы"
        placeholder="—"
        suffix="мес"
      />
    </div>
    <p v-if="error" class="flex items-center gap-sp-1 text-sm text-danger-text" role="alert">
      <CircleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-else class="text-sm text-text-2">Сработает то, что наступит раньше</p>
  </fieldset>
</template>
