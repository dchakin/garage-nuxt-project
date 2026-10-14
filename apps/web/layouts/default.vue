<script setup lang="ts">
import { CarFront, LogOut } from 'lucide-vue-next'
const { user, loggedIn, logout: logoutSession } = useAuth()
const router = useRouter()
const logoutDialogOpen = ref(false)
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await logoutSession()
    logoutDialogOpen.value = false
    router.push('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <header
      v-if="loggedIn"
      class="sticky top-0 z-10 bg-surface backdrop-blur border-b border-border"
    >
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <NuxtLink to="/cars" class="flex items-center gap-2 font-semibold text-text">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent"
          >
            <CarFront class="h-4 w-4" aria-hidden="true" />
          </span>
          Гараж
        </NuxtLink>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-text-2 hidden sm:inline">{{ user?.name }}</span>
          <button
            :disabled="loggingOut"
            class="inline-flex items-center gap-1.5 text-text-2 hover:text-text disabled:opacity-50 transition-colors"
            @click="logoutDialogOpen = true"
          >
            <UiSpinner v-if="loggingOut" />
            <LogOut v-else class="h-4 w-4" aria-hidden="true" />
            Выйти
          </button>
        </div>
      </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-6">
      <slot />
    </main>

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
