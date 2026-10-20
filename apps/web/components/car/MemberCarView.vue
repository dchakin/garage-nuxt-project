<script setup lang="ts">
/**
 * Вид участника (З4): данные машины только для чтения, пробег обновлять можно, категории —
 * в отдельном экране, внизу «Покинуть машину…». Сам запрос выхода делает родитель (`confirm`),
 * после него закрывает диалог.
 */
import { DoorOpen, Gauge, Tags } from 'lucide-vue-next'
import type { CarDetail } from '@garage/shared/types'
import { formatMileage } from '@garage/shared/utils/format'

const props = defineProps<{
  car: CarDetail
  /** Число категорий машины; без него строка остаётся без значения */
  categoriesCount?: number
  leaving?: boolean
}>()
const leaveDialogOpen = defineModel<boolean>('leaveOpen', { default: false })
const emit = defineEmits<{ 'update-mileage': []; confirm: [] }>()

const carName = computed(() => `${props.car.brand} ${props.car.model}`)

const infoRows = computed(() =>
  [
    { label: 'Марка', value: props.car.brand },
    { label: 'Модель', value: props.car.model },
    { label: 'Год выпуска', value: props.car.year ? String(props.car.year) : '' },
    { label: 'Госномер', value: props.car.plateNumber ?? '' },
    { label: 'VIN', value: props.car.vin ?? '' },
    { label: 'Владелец', value: props.car.ownerName },
  ].filter((row) => row.value),
)
</script>

<template>
  <div class="flex flex-col gap-sp-5">
    <UiAlert variant="info" :title="`Данные машины меняет владелец — ${car.ownerName}`" />

    <UiCard data-testid="member-car-info">
      <UiRowKeyValue
        v-for="row in infoRows"
        :key="row.label"
        :label="row.label"
        :value="row.value"
      />
    </UiCard>

    <UiCard>
      <UiRowSetting
        :icon="Gauge"
        label="Пробег"
        :value="formatMileage(car.currentMileage)"
        @click="emit('update-mileage')"
      />
      <UiRowSetting
        :icon="Tags"
        label="Категории"
        :value="categoriesCount ? String(categoriesCount) : undefined"
        :to="`/cars/${car.id}/categories`"
      />
    </UiCard>

    <UiButton
      variant="danger-text"
      :icon="DoorOpen"
      :loading="leaving"
      @click="leaveDialogOpen = true"
    >
      Покинуть машину…
    </UiButton>

    <UiDialog
      v-model:open="leaveDialogOpen"
      :title="`Покинуть ${carName}?`"
      message="Вы потеряете доступ к машине. Записи и напоминания останутся у владельца — вернуться можно только по его приглашению."
      confirm-text="Покинуть"
      :icon="DoorOpen"
      :loading="leaving"
      @confirm="emit('confirm')"
    />
  </div>
</template>
