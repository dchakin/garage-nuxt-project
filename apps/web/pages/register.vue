<script setup lang="ts">
import { CarFront } from 'lucide-vue-next'
definePageMeta({ middleware: 'auth' })

const { register } = useAuth()
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
    await register(name.value, email.value, password.value)
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
      <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-on-accent">
        <CarFront class="h-6 w-6" aria-hidden="true" />
      </span>
    </div>
    <h1 class="text-h1 text-text mb-6 text-center">Регистрация</h1>
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
          <PasswordInput v-model="password" :minlength="6" />
        </div>
        <p v-if="error" class="alert-error">{{ error }}</p>
        <UiButton type="submit" :loading="loading" class="w-full">
          {{ loading ? 'Регистрируем…' : 'Зарегистрироваться' }}
        </UiButton>
      </form>
    </div>
    <p class="text-sm text-text-2 text-center mt-4">
      Уже есть аккаунт? <NuxtLink to="/login" class="link">Войти</NuxtLink>
    </p>
  </div>
</template>
