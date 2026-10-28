<script setup lang="ts">
import { Mail } from 'lucide-vue-next'
import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

definePageMeta({ middleware: 'auth', layout: 'auth' })

/** После сброса пользователь уже вошёл — ведём в «Обзор» (`/` открывает последнюю машину). */
const AFTER_RESET_PATH = '/'

const { confirmPasswordReset } = useAuth()
const route = useRoute()
const router = useRouter()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

/** Адрес из письма — только для плашки «Ссылка для …»; в старых письмах его нет. */
const email = computed(() => {
  const value = route.query.email
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
  <div v-if="linkInvalid" class="flex flex-1 flex-col">
    <AuthHeader title="Ссылка не подходит" />
    <UiAlert
      variant="error"
      title="Ссылка недействительна или устарела"
      message="Запросите новую ссылку, чтобы задать пароль."
    />
    <UiButton to="/forgot-password" class="mt-auto w-full">Запросить новую ссылку</UiButton>
  </div>

  <form v-else class="flex flex-1 flex-col" @submit.prevent="onSubmit">
    <UiAlert
      v-if="email"
      variant="info"
      :icon="Mail"
      :title="`Ссылка для ${email}`"
      class="mb-sp-8"
    />
    <AuthHeader
      title="Новый пароль"
      subtitle="Придумайте пароль — со старым войти уже не получится."
      hide-logo
    />
    <div class="flex flex-col gap-sp-4">
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
    </div>
    <UiButton type="submit" :loading="loading" class="mt-auto w-full">
      {{ loading ? 'Сохраняем…' : 'Сохранить и войти' }}
    </UiButton>
  </form>
</template>
