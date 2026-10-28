<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

import { describePasswordLength } from '~/utils/passwordReset'

definePageMeta({ middleware: 'auth', layout: 'auth' })

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
const passwordHint = computed(() => describePasswordLength(password.value.length))

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
  <form class="flex flex-1 flex-col" @submit.prevent="onSubmit">
    <AuthHeader title="Создать аккаунт" subtitle="Три поля — и можно добавлять машину." />
    <div class="flex flex-col gap-sp-4">
      <UiAlert v-if="errorTitle" variant="error" :title="errorTitle" :message="errorMessage" />
      <UiField v-model="name" label="Как вас зовут" autocomplete="name" required />
      <UiField
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@mail.ru"
        autocomplete="email"
        required
      />
      <PasswordInput
        v-model="password"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
        :hint="passwordHint.isError ? undefined : passwordHint.text"
        :error="passwordHint.isError ? passwordHint.text : undefined"
      />
    </div>
    <div class="mt-auto flex flex-col items-stretch pt-sp-8">
      <UiButton type="submit" :loading="loading" class="w-full">
        {{ loading ? 'Создаём…' : 'Создать аккаунт' }}
      </UiButton>
      <NuxtLink
        to="/login"
        class="mt-sp-3 py-sp-3 text-center text-body font-semibold text-accent-text"
      >
        Уже есть аккаунт? Войти
      </NuxtLink>
    </div>
  </form>
</template>
