<script setup lang="ts">
/**
 * Поля машины в настройках (З2): марка, модель, год, госномер и VIN (моно). Пробег здесь не
 * правится — только через шторку Б5 (`MileageSheet`), где видно влияние на напоминания.
 * Кнопки нет: форма с `formId` отправляется из шапки экрана («Готово»).
 */
import type { Car } from '@garage/shared/types'
import type { CarUpdateInput } from '@garage/shared/schemas/car'

const MIN_YEAR = 1900
const MAX_YEAR = 2100
const YEAR_LENGTH = 4

const props = defineProps<{ car: Car; formId: string; serverError?: string }>()
const emit = defineEmits<{ submit: [input: CarUpdateInput] }>()

const brand = ref(props.car.brand)
const model = ref(props.car.model)
const year = ref(props.car.year ? String(props.car.year) : '')
const plateNumber = ref(props.car.plateNumber ?? '')
const vin = ref(props.car.vin ?? '')
const submitted = ref(false)

const parsedYear = computed(() => (year.value.trim() ? Number(year.value.trim()) : null))
const errors = computed(() => ({
  brand: brand.value.trim() ? undefined : 'Укажите марку',
  model: model.value.trim() ? undefined : 'Укажите модель',
  year:
    parsedYear.value === null ||
    (Number.isInteger(parsedYear.value) &&
      parsedYear.value >= MIN_YEAR &&
      parsedYear.value <= MAX_YEAR)
      ? undefined
      : `Год от ${MIN_YEAR} до ${MAX_YEAR}`,
}))
const isValid = computed(() => !errors.value.brand && !errors.value.model && !errors.value.year)

function onSubmit() {
  submitted.value = true
  if (!isValid.value) return
  emit('submit', {
    brand: brand.value.trim(),
    model: model.value.trim(),
    year: parsedYear.value,
    plateNumber: plateNumber.value.trim() || null,
    vin: vin.value.trim() || null,
  })
}
</script>

<template>
  <form :id="formId" class="flex flex-col gap-sp-4" novalidate @submit.prevent="onSubmit">
    <UiAlert
      v-if="serverError"
      variant="error"
      title="Не удалось сохранить"
      :message="serverError"
    />
    <UiField
      v-model="brand"
      label="Марка"
      autocomplete="off"
      :error="submitted ? errors.brand : undefined"
    />
    <UiField
      v-model="model"
      label="Модель"
      autocomplete="off"
      :error="submitted ? errors.model : undefined"
    />
    <UiField
      v-model="year"
      type="tel"
      label="Год выпуска"
      :maxlength="YEAR_LENGTH"
      autocomplete="off"
      :error="submitted ? errors.year : undefined"
    />
    <UiField v-model="plateNumber" label="Госномер" mono uppercase autocomplete="off" />
    <UiField v-model="vin" label="VIN" mono autocomplete="off" />
  </form>
</template>
