<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { fetch: refreshSession } = useUserSession()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await refreshSession()
    router.push('/cars')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось войти'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-sm mx-auto mt-16">
    <h1 class="text-xl font-semibold text-slate-800 mb-6 text-center">Вход в Гараж</h1>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Email</label>
        <input v-model="email" type="email" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Пароль</label>
        <input v-model="password" type="password" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-slate-800 text-white py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
      >
        Войти
      </button>
    </form>
    <p class="text-sm text-slate-500 text-center mt-4">
      Нет аккаунта? <NuxtLink to="/register" class="text-slate-800 underline">Зарегистрироваться</NuxtLink>
    </p>
  </div>
</template>
