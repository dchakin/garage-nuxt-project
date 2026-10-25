<script setup lang="ts">
/**
 * Шаг 1 мастера первого запуска (А4 «Первая машина»): марка, модель и пробег обязательны,
 * год и госномер — по желанию. Ничего не отправляет: машину создаёт страница на последнем шаге,
 * чтобы «Назад» с шага 2 не терял данные и не плодил машины.
 */
import { computed, ref } from 'vue'
import { MAX_MILEAGE_KM } from '@garage/shared/schemas/car'
import { MAX_CAR_YEAR, MIN_CAR_YEAR, parseCarYear, type CarStepValues } from '~/utils/onboardingCar'

const YEAR_LENGTH = 4

const form = defineModel<CarStepValues>({ required: true })
const emit = defineEmits<{ next: [] }>()

const submitted = ref(false)

const brandError = computed(() =>
  submitted.value && !form.value.brand.trim() ? 'Укажите марку' : undefined,
)
const modelError = computed(() =>
  submitted.value && !form.value.model.trim() ? 'Укажите модель' : undefined,
)
const mileageError = computed(() => {
  if (!submitted.value) return undefined
  const mileage = form.value.currentMileage
  if (mileage == null) return 'Укажите текущий пробег'
  return mileage > MAX_MILEAGE_KM ? 'Слишком большой пробег' : undefined
})
const yearError = computed(() =>
  submitted.value && Number.isNaN(parseCarYear(form.value.year))
    ? `Год от ${MIN_CAR_YEAR} до ${MAX_CAR_YEAR}`
    : undefined,
)

function onSubmit() {
  submitted.value = true
  if (brandError.value || modelError.value || mileageError.value || yearError.value) return
  emit('next')
}
</script>

<template>
  <form class="flex flex-col gap-sp-4" novalidate @submit.prevent="onSubmit">
    <div class="grid grid-cols-2 gap-sp-3">
      <UiField
        v-model="form.brand"
        label="Марка"
        placeholder="Toyota"
        required
        :error="brandError"
      />
      <UiField
        v-model="form.model"
        label="Модель"
        placeholder="Camry"
        required
        :error="modelError"
      />
    </div>
    <UiField
      v-model="form.currentMileage"
      type="number"
      label="Пробег"
      suffix="км"
      hint="Сколько сейчас на одометре"
      required
      :error="mileageError"
    />
    <div class="grid grid-cols-2 gap-sp-3">
      <UiField
        v-model="form.year"
        type="tel"
        label="Год выпуска"
        placeholder="2018"
        :maxlength="YEAR_LENGTH"
        :error="yearError"
      />
      <UiField v-model="form.plateNumber" label="Госномер" placeholder="А123ВС 77" mono uppercase />
    </div>
    <UiButton type="submit" class="mt-sp-2 w-full">Далее</UiButton>
  </form>
</template>
