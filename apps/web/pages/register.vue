<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

definePageMeta({ middleware: 'auth' })

/** Куда ведёт регистрация: мастер первого запуска (#72). */
const AFTER_REGISTER_PATH = '/onboarding'

const { register } = useAuth()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const errorTitle = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function onSubmit() {
  errorTitle.value = ''
  errorMessage.value = ''
  loading.value = true
  try {
    await register(name.value, email.value, password.value)
    await router.push(AFTER_REGISTER_PATH)
  } catch (e: any) {
    errorTitle.value = 'Не удалось зарегистрироваться'
    errorMessage.value = e?.data?.statusMessage || 'Проверьте соединение и попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col pt-sp-8">
    <AuthHeader title="Регистрация" subtitle="Создайте аккаунт, чтобы вести учёт машины" />
    <form class="flex flex-col gap-sp-4" @submit.prevent="onSubmit">
      <UiAlert v-if="errorTitle" variant="error" :title="errorTitle" :message="errorMessage" />
      <UiField v-model="name" label="Имя" autocomplete="name" required />
      <UiField
        v-model="email"
        label="Email"
        type="email"
        placeholder="name@example.com"
        autocomplete="email"
        required
      />
      <PasswordInput
        v-model="password"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
        :hint="`Минимум ${MIN_PASSWORD_LENGTH} символов`"
      />
      <UiButton type="submit" :loading="loading" class="w-full">
        {{ loading ? 'Регистрируем…' : 'Зарегистрироваться' }}
      </UiButton>
    </form>
    <p class="mt-sp-6 text-center text-sm text-text-2">
      Уже есть аккаунт?
      <NuxtLink to="/login" class="font-semibold text-accent-text">Войти</NuxtLink>
    </p>
  </div>
</template>
