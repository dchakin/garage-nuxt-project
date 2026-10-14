<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { fetchCar, updateCar, deleteCar, saving, deletingId } = useCars()
const deleteDialogOpen = ref(false)

const car = reactive(await fetchCar(carId))
const error = ref('')

const inviteEmail = ref('')
const inviteError = ref('')
const inviteSuccess = ref('')
const inviting = ref(false)

async function onUpdate(input: any) {
  error.value = ''
  try {
    await updateCar(carId, input)
    await navigateTo(`/cars/${carId}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить'
  }
}

async function refresh() {
  Object.assign(car, await fetchCar(carId))
}

async function onDelete() {
  await deleteCar(carId)
  deleteDialogOpen.value = false
  await navigateTo('/cars')
}

async function onInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviting.value = true
  try {
    await $fetch(`/api/cars/${carId}/invite`, {
      method: 'POST',
      body: { email: inviteEmail.value },
    })
    inviteSuccess.value = 'Приглашение отправлено'
    inviteEmail.value = ''
    await refresh()
  } catch (e: any) {
    inviteError.value = e?.data?.statusMessage || 'Не удалось пригласить'
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <div>
    <BackLink :to="`/cars/${carId}`">{{ car.brand }} {{ car.model }}</BackLink>

    <h1 class="text-h1 text-text mt-2 mb-4">Редактирование автомобиля</h1>

    <div class="card p-4 mb-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <CarForm
        :initial="car"
        :saving="saving"
        @submit="onUpdate"
        @cancel="navigateTo(`/cars/${carId}`)"
      />
    </div>

    <div v-if="car.role === 'owner'" class="card p-4 mb-4">
      <h2 class="font-medium text-text mb-2">Участники</h2>
      <ul class="text-sm text-text-2 mb-3 space-y-1">
        <li>Владелец: вы</li>
        <li v-for="m in car.members" :key="m.id">{{ m.user.name }} ({{ m.user.email }})</li>
      </ul>
      <form class="flex gap-2" @submit.prevent="onInvite">
        <input
          v-model="inviteEmail"
          type="email"
          placeholder="email@example.com"
          :disabled="inviting"
          class="input flex-1"
        />
        <UiButton type="submit" size="sm" :loading="inviting">
          {{ inviting ? 'Отправляем…' : 'Пригласить' }}
        </UiButton>
      </form>
      <p v-if="inviteError" class="alert-error mt-2">{{ inviteError }}</p>
      <p v-if="inviteSuccess" class="alert-success mt-2">{{ inviteSuccess }}</p>
    </div>

    <div v-if="car.role === 'owner'" class="pt-4 border-t border-border">
      <UiButton
        variant="danger-text"
        :icon="Trash2"
        :loading="deletingId === carId"
        @click="deleteDialogOpen = true"
      >
        Удалить автомобиль
      </UiButton>
    </div>

    <UiDialog
      v-model:open="deleteDialogOpen"
      :title="`Удалить ${car.brand} ${car.model}?`"
      message="Вместе с машиной удалятся все её записи и напоминания. Это нельзя отменить."
      confirm-text="Удалить"
      :icon="Trash2"
      :loading="deletingId === carId"
      @confirm="onDelete"
    />
  </div>
</template>
