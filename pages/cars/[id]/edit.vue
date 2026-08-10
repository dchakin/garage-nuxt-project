<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { fetchCar, updateCar, deleteCar, saving, deletingId } = useCars()
const { confirm } = useConfirmDialog()

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
  const ok = await confirm({
    title: 'Удалить автомобиль?',
    message: `Автомобиль «${car.brand} ${car.model}» и все записи по нему будут удалены безвозвратно.`,
    confirmText: 'Удалить',
    danger: true
  })
  if (!ok) return
  await deleteCar(carId)
  await navigateTo('/cars')
}

async function onInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviting.value = true
  try {
    await $fetch(`/api/cars/${carId}/invite`, { method: 'POST', body: { email: inviteEmail.value } })
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
    <NuxtLink :to="`/cars/${carId}`" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← {{ car.brand }} {{ car.model }}</NuxtLink>

    <h1 class="text-lg font-semibold text-slate-800 mt-2 mb-4">Редактирование автомобиля</h1>

    <div class="card p-4 mb-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <CarForm :initial="car" :saving="saving" @submit="onUpdate" @cancel="navigateTo(`/cars/${carId}`)" />
    </div>

    <div v-if="car.role === 'owner'" class="card p-4 mb-4">
      <h2 class="font-medium text-slate-800 mb-2">Участники</h2>
      <ul class="text-sm text-slate-600 mb-3 space-y-1">
        <li>Владелец: вы</li>
        <li v-for="m in car.members" :key="m.id">{{ m.user.name }} ({{ m.user.email }})</li>
      </ul>
      <form class="flex gap-2" @submit.prevent="onInvite">
        <input v-model="inviteEmail" type="email" placeholder="email@example.com" :disabled="inviting" class="input flex-1" />
        <button type="submit" :disabled="inviting" class="btn-primary h-10 px-3 text-sm">
          <Spinner v-if="inviting" />
          {{ inviting ? 'Отправка...' : 'Пригласить' }}
        </button>
      </form>
      <p v-if="inviteError" class="alert-error mt-2">{{ inviteError }}</p>
      <p v-if="inviteSuccess" class="alert-success mt-2">{{ inviteSuccess }}</p>
    </div>

    <div v-if="car.role === 'owner'" class="pt-4 border-t border-slate-200">
      <button :disabled="deletingId === carId" class="btn-danger px-3 py-1.5 text-sm" @click="onDelete">
        <Spinner v-if="deletingId === carId" />
        {{ deletingId === carId ? 'Удаление...' : 'Удалить автомобиль' }}
      </button>
    </div>
  </div>
</template>
