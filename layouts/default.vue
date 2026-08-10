<script setup lang="ts">
const { user, loggedIn, clear } = useUserSession()
const router = useRouter()
const { confirm } = useConfirmDialog()
const loggingOut = ref(false)

async function logout() {
  const ok = await confirm({
    title: 'Выйти из аккаунта?',
    message: 'Вам нужно будет снова войти, чтобы продолжить пользоваться приложением.',
    confirmText: 'Выйти'
  })
  if (!ok) return

  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    router.push('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header v-if="loggedIn" class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <NuxtLink to="/cars" class="flex items-center gap-2 font-semibold text-slate-800">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm">🚗</span>
          Гараж
        </NuxtLink>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-slate-500 hidden sm:inline">{{ user?.name }}</span>
          <button
            :disabled="loggingOut"
            class="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-colors"
            @click="logout"
          >
            <Spinner v-if="loggingOut" />
            Выйти
          </button>
        </div>
      </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-6">
      <slot />
    </main>

    <ConfirmDialog />
  </div>
</template>
