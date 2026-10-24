<script setup lang="ts">
import { CarFront, LogOut } from 'lucide-vue-next'

// Экран «Профиль» (З1, #54): push, тема, список машин, аккаунт (#73), выход.
definePageMeta({ middleware: 'auth', layout: 'plain' })

const { user, logout: logoutSession } = useAuth()
const { cars, fetchCars } = useCars()
const { getLastCarId } = useLastCar()

const logoutDialogOpen = ref(false)
const loggingOut = ref(false)

// Назад — к последней открытой машине, иначе к списку машин
const backTo = computed(() => {
  const lastCarId = getLastCarId()
  return lastCarId ? `/cars/${lastCarId}` : '/cars'
})

// Счётчик «Мои машины» — украшение: без сети остаётся прежний список
onMounted(() => fetchCars().catch(() => {}))

async function logout() {
  loggingOut.value = true
  try {
    await logoutSession()
    logoutDialogOpen.value = false
    await navigateTo('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div>
    <UiAppBar variant="back" title="Профиль" :back-to="backTo" class="sticky top-0 z-10" />
    <div class="flex flex-col gap-sp-5 px-sp-4">
      <div class="flex items-center gap-sp-4 py-sp-2">
        <UiAvatar :name="user?.name ?? ''" class="!h-16 !w-16 !text-h2" />
        <div class="min-w-0">
          <p class="truncate text-h2 text-text">{{ user?.name }}</p>
          <p class="truncate text-body text-text-2">{{ user?.email }}</p>
        </div>
      </div>

      <section class="flex flex-col gap-sp-2" aria-labelledby="profile-notifications">
        <h2 id="profile-notifications" class="text-xs font-semibold uppercase text-text-2">
          Уведомления
        </h2>
        <PushSettings />
      </section>

      <section class="flex flex-col gap-sp-2" aria-labelledby="profile-app">
        <h2 id="profile-app" class="text-xs font-semibold uppercase text-text-2">Приложение</h2>
        <UiCard>
          <UiRowSetting
            :icon="CarFront"
            label="Мои машины"
            :value="cars.length ? String(cars.length) : undefined"
            to="/cars"
          />
          <ProfileThemeSetting />
        </UiCard>
      </section>

      <ProfileAccountSection />

      <UiButton variant="secondary" :icon="LogOut" class="w-full" @click="logoutDialogOpen = true">
        Выйти
      </UiButton>
    </div>

    <UiDialog
      v-model:open="logoutDialogOpen"
      title="Выйти из аккаунта?"
      message="Вам нужно будет снова войти, чтобы продолжить пользоваться приложением."
      confirm-text="Выйти"
      variant="primary"
      :loading="loggingOut"
      @confirm="logout"
    />
  </div>
</template>
