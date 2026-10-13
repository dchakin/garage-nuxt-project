<script setup lang="ts">
import type { Car } from '@garage/shared/types'
import type { CarInput } from '@garage/shared/schemas/car'

const props = defineProps<{ initial?: Car | null; saving?: boolean }>()
const emit = defineEmits<{ submit: [CarInput]; cancel: [] }>()

const form = reactive<CarInput>({
  brand: props.initial?.brand ?? '',
  model: props.initial?.model ?? '',
  year: props.initial?.year ?? null,
  plateNumber: props.initial?.plateNumber ?? '',
  vin: props.initial?.vin ?? '',
  currentMileage: props.initial?.currentMileage ?? 0,
  photoUrl: props.initial?.photoUrl ?? '',
})

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Марка</label>
        <input v-model="form.brand" required class="input" />
      </div>
      <div>
        <label class="label">Модель</label>
        <input v-model="form.model" required class="input" />
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Год</label>
        <input v-model.number="form.year" type="number" class="input" />
      </div>
      <div>
        <label class="label">Пробег, км</label>
        <input v-model.number="form.currentMileage" type="number" min="0" class="input" />
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Гос. номер</label>
        <input v-model="form.plateNumber" class="input font-mono font-semibold" />
      </div>
      <div>
        <label class="label">VIN</label>
        <input v-model="form.vin" class="input font-mono font-semibold" />
      </div>
    </div>
    <div class="flex gap-3 pt-2">
      <UiButton type="submit" :loading="saving" class="flex-1">
        {{ saving ? 'Сохраняем…' : 'Сохранить' }}
      </UiButton>
      <UiButton variant="secondary" :disabled="saving" class="flex-1" @click="emit('cancel')">
        Отмена
      </UiButton>
    </div>
  </form>
</template>
