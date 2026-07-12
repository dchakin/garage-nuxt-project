<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { fetch: refreshSession } = useUserSession()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value }
    })
    await refreshSession()
    router.push('/cars')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Не удалось зарегистрироваться'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-sm mx-auto mt-16">
    <h1 class="text-xl font-semibold text-slate-800 mb-6 text-center">Регистрация</h1>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Имя</label>
        <input v-model="name" type="text" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Email</label>
        <input v-model="email" type="email" required class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Пароль</label>
        <input v-model="password" type="password" required minlength="6" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-slate-800 text-white py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
      >
        Зарегистрироваться
      </button>
    </form>
    <p class="text-sm text-slate-500 text-center mt-4">
      Уже есть аккаунт? <NuxtLink to="/login" class="text-slate-800 underline">Войти</NuxtLink>
    </p>
  </div>
</template>
