<script setup lang="ts">
import { REDIRECT_QUERY_KEY, safeRedirect } from '~/utils/redirectTarget'

definePageMeta({ middleware: 'auth', layout: 'auth' })

const INVALID_CREDENTIALS_TITLE = 'Неверный email или пароль'
const CHECK_INPUT_HINT = 'Проверьте раскладку и Caps Lock.'
const RECOVER_PASSWORD_HINT = 'Забыли пароль — восстановите по ссылке ниже.'
const LOGIN_FAILED_TITLE = 'Не удалось войти'

const { login } = useAuth()
const { passwordReset, fetchAuthConfig } = useAuthConfig()
const router = useRouter()
const route = useRoute()

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
    await router.push(safeRedirect(route.query[REDIRECT_QUERY_KEY]))
  } catch (e: any) {
    // Неверные данные — только плашка, поля не подсвечиваются (макет А2)
    if (e?.statusCode === 401 || e?.status === 401) {
      errorTitle.value = INVALID_CREDENTIALS_TITLE
      // Ссылка «Забыли пароль?» есть только при включённой почте — без неё на неё не ссылаемся
      errorMessage.value = passwordReset.value
        ? `${CHECK_INPUT_HINT} ${RECOVER_PASSWORD_HINT}`
        : CHECK_INPUT_HINT
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
  <form class="flex flex-1 flex-col" @submit.prevent="onSubmit">
    <AuthHeader
      title="Гараж"
      subtitle="Сервисная книжка машины в телефоне: траты, ТО и напоминания о сроках."
    />
    <div class="flex flex-col gap-sp-4">
      <UiAlert v-if="errorTitle" variant="error" :title="errorTitle" :message="errorMessage" />
      <UiField
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@mail.ru"
        autocomplete="email"
        required
      />
      <PasswordInput v-model="password" placeholder="Пароль" autocomplete="current-password" />
      <NuxtLink
        v-if="passwordReset"
        to="/forgot-password"
        class="self-start px-sp-2 py-sp-2 text-body font-semibold text-accent-text"
      >
        Забыли пароль?
      </NuxtLink>
    </div>
    <div class="mt-auto flex flex-col items-stretch pt-sp-8">
      <UiButton type="submit" :loading="loading" class="w-full">
        {{ loading ? 'Входим…' : 'Войти' }}
      </UiButton>
      <NuxtLink
        to="/register"
        class="mt-sp-3 py-sp-3 text-center text-body font-semibold text-accent-text"
      >
        Нет аккаунта? Создать
      </NuxtLink>
    </div>
  </form>
</template>
