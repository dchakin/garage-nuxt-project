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
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Марка</label>
        <input v-model="form.brand" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Модель</label>
        <input v-model="form.model" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Год</label>
        <input v-model.number="form.year" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Пробег, км</label>
        <input v-model.number="form.currentMileage" type="number" min="0" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Гос. номер</label>
        <input v-model="form.plateNumber" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">VIN</label>
        <input v-model="form.vin" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="flex-1 rounded-lg bg-slate-800 text-white py-2 font-medium hover:bg-slate-700">
        Сохранить
      </button>
      <button type="button" class="flex-1 rounded-lg border border-slate-300 py-2 font-medium" @click="emit('cancel')">
        Отмена
      </button>
    </div>
  </form>
</template>
