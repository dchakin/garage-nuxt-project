<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

definePageMeta({ middleware: 'auth' })

/** После сброса пользователь уже вошёл — ведём в «Обзор» (`/` открывает последнюю машину). */
const AFTER_RESET_PATH = '/'

const { confirmPasswordReset } = useAuth()
const route = useRoute()
const router = useRouter()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const password = ref('')
const passwordError = ref('')
/** Ссылка не подошла (нет токена, просрочена, уже использована) — единственный выход: запросить новую. */
const linkInvalid = ref(!token.value)
const errorMessage = ref('')
const loading = ref(false)

async function onSubmit() {
  errorMessage.value = ''
  passwordError.value = ''
  if (password.value.length < MIN_PASSWORD_LENGTH) {
    passwordError.value = `Минимум ${MIN_PASSWORD_LENGTH} символов`
    return
  }
  loading.value = true
  try {
    await confirmPasswordReset(token.value, password.value)
    await router.push(AFTER_RESET_PATH)
  } catch (e: any) {
    if ((e?.statusCode ?? e?.status) === 400) {
      linkInvalid.value = true
    } else {
      errorMessage.value = 'Проверьте соединение и попробуйте ещё раз.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col pt-sp-8">
    <template v-if="linkInvalid">
      <AuthHeader title="Ссылка не подходит" />
      <UiAlert
        variant="error"
        title="Ссылка недействительна или устарела"
        message="Запросите новую ссылку, чтобы задать пароль."
      />
      <UiButton to="/forgot-password" class="mt-sp-4 w-full">Запросить новую ссылку</UiButton>
    </template>

    <template v-else>
      <AuthHeader title="Новый пароль" subtitle="Придумайте пароль, которым будете входить" />
      <form class="flex flex-col gap-sp-4" @submit.prevent="onSubmit">
        <UiAlert
          v-if="errorMessage"
          variant="error"
          title="Не удалось сохранить пароль"
          :message="errorMessage"
        />
        <PasswordInput
          v-model="password"
          label="Новый пароль"
          autocomplete="new-password"
          :hint="`Минимум ${MIN_PASSWORD_LENGTH} символов`"
          :error="passwordError"
        />
        <UiButton type="submit" :loading="loading" class="w-full">
          {{ loading ? 'Сохраняем…' : 'Сохранить и войти' }}
        </UiButton>
      </form>
    </template>
  </div>
</template>
