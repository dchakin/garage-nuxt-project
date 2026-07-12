<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const carId = Number(route.params.id)
const { fetchCar, updateCar, deleteCar } = useCars()

const car = reactive(await fetchCar(carId))
const editing = ref(false)
const error = ref('')

const inviteEmail = ref('')
const inviteError = ref('')
const inviteSuccess = ref('')

async function onUpdate(input: any) {
  error.value = ''
  try {
    await updateCar(carId, input)
    editing.value = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось сохранить'
  }
}

async function refresh() {
  Object.assign(car, await fetchCar(carId))
}

async function onDelete() {
  if (!confirm('Удалить автомобиль вместе со всеми записями?')) return
  await deleteCar(carId)
  await navigateTo('/cars')
}

async function onInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  try {
    await $fetch(`/api/cars/${carId}/invite`, { method: 'POST', body: { email: inviteEmail.value } })
    inviteSuccess.value = 'Приглашение отправлено'
    inviteEmail.value = ''
    await refresh()
  } catch (e: any) {
    inviteError.value = e?.data?.statusMessage || 'Не удалось пригласить'
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/cars" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Все автомобили</NuxtLink>

    <div class="flex items-center justify-between mt-2 mb-4">
      <h1 class="text-lg font-semibold text-slate-800">{{ car.brand }} {{ car.model }}</h1>
      <button v-if="car.role === 'owner'" class="text-sm text-slate-500 hover:text-slate-800 transition-colors" @click="editing = !editing">
        {{ editing ? 'Отмена' : 'Изменить' }}
      </button>
    </div>

    <div v-if="editing" class="card p-4 mb-4">
      <p v-if="error" class="alert-error mb-2">{{ error }}</p>
      <CarForm :initial="car" @submit="onUpdate" @cancel="editing = false" />
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="card p-4">
        <p class="text-xs text-slate-500">Пробег</p>
        <p class="text-xl font-semibold text-slate-800">{{ car.currentMileage.toLocaleString('ru-RU') }} км</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-slate-500">Гос. номер</p>
        <p class="text-xl font-semibold text-slate-800">{{ car.plateNumber || '—' }}</p>
      </div>
    </div>

    <nav class="flex gap-4 border-b border-slate-200 mb-4 text-sm">
      <NuxtLink :to="`/cars/${carId}/entries`" class="pb-2 border-b-2 border-indigo-600 text-slate-800 font-medium">
        Журнал
      </NuxtLink>
    </nav>

    <div v-if="car.role === 'owner'" class="card p-4 mb-4">
      <h2 class="font-medium text-slate-800 mb-2">Участники</h2>
      <ul class="text-sm text-slate-600 mb-3 space-y-1">
        <li>Владелец: вы</li>
        <li v-for="m in car.members" :key="m.id">{{ m.user.name }} ({{ m.user.email }})</li>
      </ul>
      <form class="flex gap-2" @submit.prevent="onInvite">
        <input v-model="inviteEmail" type="email" placeholder="email@example.com" class="input flex-1" />
        <button type="submit" class="btn-primary px-3 py-1.5 text-sm">Пригласить</button>
      </form>
      <p v-if="inviteError" class="alert-error mt-2">{{ inviteError }}</p>
      <p v-if="inviteSuccess" class="alert-success mt-2">{{ inviteSuccess }}</p>
    </div>

    <div v-if="car.role === 'owner'" class="pt-4 border-t border-slate-200">
      <button class="btn-danger px-3 py-1.5 text-sm" @click="onDelete">
        Удалить автомобиль
      </button>
    </div>
  </div>
</template>
