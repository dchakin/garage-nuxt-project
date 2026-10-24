<script setup lang="ts">
/**
 * Диалог «Удалить аккаунт» (И10): перечисляет свои машины (удалятся вместе с записями и
 * напоминаниями) и чужие (пользователь из них выйдет). Запрос выполняет родитель.
 */
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { formatCarTitle, splitCarsForDeletion, type AccountCar } from '~/utils/accountDeletion'

const props = defineProps<{
  cars: AccountCar[]
  userId: number
  loading?: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()

const groups = computed(() => splitCarsForDeletion(props.cars, props.userId))
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Удалить аккаунт?"
    confirm-text="Удалить"
    :icon="Trash2"
    :loading="loading"
    @confirm="emit('confirm')"
  >
    <div class="flex flex-col gap-sp-3" data-testid="delete-account-details">
      <div v-if="groups.owned.length" data-testid="delete-account-owned">
        <p>Удалятся ваши машины вместе с записями и напоминаниями:</p>
        <ul class="mt-sp-1 list-disc pl-sp-5 text-text">
          <li v-for="car in groups.owned" :key="car.id">{{ formatCarTitle(car) }}</li>
        </ul>
      </div>
      <div v-if="groups.shared.length" data-testid="delete-account-shared">
        <p>Вы выйдете из чужих машин, ваши записи в них удалятся:</p>
        <ul class="mt-sp-1 list-disc pl-sp-5 text-text">
          <li v-for="car in groups.shared" :key="car.id">{{ formatCarTitle(car) }}</li>
        </ul>
      </div>
      <p v-if="!groups.owned.length && !groups.shared.length">
        Ваши данные будут удалены из «Гаража».
      </p>
      <p>Это нельзя отменить.</p>
    </div>
  </UiDialog>
</template>
