<script setup lang="ts">
/**
 * Диалог «Удалить машину» (И2): перечисляет, что удалится (записи, напоминания) и кто из
 * участников потеряет доступ. Запрос выполняет родитель, после него закрывает диалог сам.
 */
import { Trash2 } from 'lucide-vue-next'
import type { CarDetail } from '@garage/shared/types'
import { describeCarDeletion } from '~/utils/carDeletion'

const props = defineProps<{
  car: Pick<CarDetail, 'brand' | 'model' | 'entriesCount' | 'remindersCount' | 'members'>
  loading?: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()

const message = computed(() =>
  describeCarDeletion({
    entriesCount: props.car.entriesCount,
    remindersCount: props.car.remindersCount,
    memberNames: props.car.members.map((member) => member.user.name),
  }),
)
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="`Удалить ${car.brand} ${car.model}?`"
    :message="message"
    confirm-text="Удалить"
    :icon="Trash2"
    :loading="loading"
    @confirm="emit('confirm')"
  />
</template>
