<script setup lang="ts">
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { PASSWORD_RESET_TTL_LABEL } from '~/utils/passwordReset'

definePageMeta({ middleware: 'auth' })

const SEND_FAILED_TITLE = 'Не удалось отправить письмо'

const { requestPasswordReset } = useAuth()
const toast = useToast()
const resendTimer = useResendTimer()

/** А7 — ввод email, А8 — «Ссылка отправлена». */
const step = ref<'request' | 'sent'>('request')
const email = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function sendLink(): Promise<boolean> {
  errorMessage.value = ''
  loading.value = true
  try {
    await requestPasswordReset(email.value.trim())
    resendTimer.start()
    return true
  } catch {
    errorMessage.value = 'Проверьте соединение и попробуйте ещё раз.'
    return false
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (await sendLink()) step.value = 'sent'
}

async function onResend() {
  if (resendTimer.isActive.value || loading.value) return
  if (await sendLink()) toast.show({ message: 'Письмо отправлено ещё раз' })
}

function changeEmail() {
  resendTimer.stop()
  errorMessage.value = ''
  step.value = 'request'
}
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col pt-sp-8">
    <template v-if="step === 'request'">
      <AuthHeader
        title="Восстановление пароля"
        subtitle="Укажите email — отправим ссылку для нового пароля"
      />
      <form class="flex flex-col gap-sp-4" @submit.prevent="onSubmit">
        <UiAlert
          v-if="errorMessage"
          variant="error"
          :title="SEND_FAILED_TITLE"
          :message="errorMessage"
        />
        <UiField
          v-model="email"
          label="Email"
          type="email"
          placeholder="name@example.com"
          autocomplete="email"
          required
        />
        <UiButton type="submit" :loading="loading" class="w-full">
          {{ loading ? 'Отправляем…' : 'Отправить ссылку' }}
        </UiButton>
      </form>
    </template>

    <template v-else>
      <AuthHeader
        title="Ссылка отправлена"
        :subtitle="`Если аккаунт с адресом ${email} есть, мы отправили на него письмо. Ссылка действует ${PASSWORD_RESET_TTL_LABEL}.`"
      />
      <div class="flex flex-col gap-sp-4">
        <UiAlert
          v-if="errorMessage"
          variant="error"
          :title="SEND_FAILED_TITLE"
          :message="errorMessage"
        />
        <UiButton to="mailto:" :icon="Mail" class="w-full">Открыть почту</UiButton>
        <p
          v-if="resendTimer.isActive.value"
          class="text-center text-sm text-text-2"
          data-testid="resend-timer"
        >
          Отправить ещё раз можно через {{ resendTimer.remaining.value }} с
        </p>
        <UiButton v-else variant="secondary" :loading="loading" class="w-full" @click="onResend">
          {{ loading ? 'Отправляем…' : 'Отправить ещё раз' }}
        </UiButton>
        <UiButton variant="text" class="w-full" @click="changeEmail">Изменить email</UiButton>
      </div>
    </template>

    <NuxtLink
      to="/login"
      class="mt-sp-6 flex items-center justify-center gap-2 text-sm font-semibold text-accent-text"
    >
      <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      Вернуться ко входу
    </NuxtLink>
  </div>
</template>
