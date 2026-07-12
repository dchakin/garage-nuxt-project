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
    <div class="flex justify-center mb-4">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white text-xl">🚗</span>
    </div>
    <h1 class="text-xl font-semibold text-slate-800 mb-6 text-center">Регистрация</h1>
    <div class="card p-6 shadow-sm">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label">Имя</label>
          <input v-model="name" type="text" required class="input" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" required class="input" />
        </div>
        <div>
          <label class="label">Пароль</label>
          <input v-model="password" type="password" required minlength="6" class="input" />
        </div>
        <p v-if="error" class="alert-error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn-primary w-full py-2">
          Зарегистрироваться
        </button>
      </form>
    </div>
    <p class="text-sm text-slate-500 text-center mt-4">
      Уже есть аккаунт? <NuxtLink to="/login" class="link">Войти</NuxtLink>
    </p>
  </div>
</template>
