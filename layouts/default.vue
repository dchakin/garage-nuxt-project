<script setup lang="ts">
const { user, loggedIn, clear } = useUserSession()
const router = useRouter()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  clear()
  router.push('/login')
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
          <button class="text-slate-500 hover:text-slate-800 transition-colors" @click="logout">Выйти</button>
        </div>
      </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
