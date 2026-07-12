<script setup lang="ts">
import type { Car } from '~~/shared/types'
import type { CarInput } from '~~/shared/schemas/car'

const props = defineProps<{ initial?: Car | null }>()
const emit = defineEmits<{ submit: [CarInput]; cancel: [] }>()

const form = reactive<CarInput>({
  brand: props.initial?.brand ?? '',
  model: props.initial?.model ?? '',
  year: props.initial?.year ?? null,
  plateNumber: props.initial?.plateNumber ?? '',
  vin: props.initial?.vin ?? '',
  currentMileage: props.initial?.currentMileage ?? 0,
  photoUrl: props.initial?.photoUrl ?? ''
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
        <input v-model="form.plateNumber" class="input" />
      </div>
      <div>
        <label class="label">VIN</label>
        <input v-model="form.vin" class="input" />
      </div>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1 py-2">
        Сохранить
      </button>
      <button type="button" class="btn-secondary flex-1 py-2" @click="emit('cancel')">
        Отмена
      </button>
    </div>
  </form>
</template>
