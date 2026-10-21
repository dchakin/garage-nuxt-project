<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const INVALID_CREDENTIALS_TITLE = 'Неверный email или пароль'
const LOGIN_FAILED_TITLE = 'Не удалось войти'

const { login } = useAuth()
const { passwordReset, fetchAuthConfig } = useAuthConfig()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorTitle = ref('')
const errorMessage = ref('')
const loading = ref(false)

onMounted(fetchAuthConfig)

async function onSubmit() {
  errorTitle.value = ''
  errorMessage.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await router.push('/cars')
  } catch (e: any) {
    // Неверные данные — только плашка, поля не подсвечиваются (макет А2)
    if (e?.statusCode === 401 || e?.status === 401) {
      errorTitle.value = INVALID_CREDENTIALS_TITLE
      errorMessage.value = 'Проверьте данные и попробуйте ещё раз.'
    } else {
      errorTitle.value = LOGIN_FAILED_TITLE
      errorMessage.value = 'Проверьте соединение и попробуйте ещё раз.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col pt-sp-8">
    <AuthHeader title="Вход в Гараж" subtitle="Учёт обслуживания и расходов на машину" />
    <form class="flex flex-col gap-sp-4" @submit.prevent="onSubmit">
      <UiAlert v-if="errorTitle" variant="error" :title="errorTitle" :message="errorMessage" />
      <UiField
        v-model="email"
        label="Email"
        type="email"
        placeholder="name@example.com"
        autocomplete="email"
        required
      />
      <PasswordInput v-model="password" autocomplete="current-password" />
      <div v-if="passwordReset" class="-mt-sp-2 flex justify-end">
        <NuxtLink to="/forgot-password" class="text-sm font-semibold text-accent-text">
          Забыли пароль?
        </NuxtLink>
      </div>
      <UiButton type="submit" :loading="loading" class="w-full">
        {{ loading ? 'Входим…' : 'Войти' }}
      </UiButton>
    </form>
    <p class="mt-sp-6 text-center text-sm text-text-2">
      Нет аккаунта?
      <NuxtLink to="/register" class="font-semibold text-accent-text">Зарегистрироваться</NuxtLink>
    </p>
  </div>
</template>
