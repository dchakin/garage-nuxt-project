<script setup lang="ts">
import { Mail, MailCheck } from 'lucide-vue-next'
import { formatCountdown, PASSWORD_RESET_TTL_LABEL } from '~/utils/passwordReset'

definePageMeta({ middleware: 'auth', layout: 'auth' })

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
</script>

<template>
  <form v-if="step === 'request'" class="flex flex-1 flex-col" @submit.prevent="onSubmit">
    <AuthHeader
      title="Восстановить пароль"
      subtitle="Пришлём ссылку для нового пароля на почту, с которой вы регистрировались."
      back-to="/login"
    />
    <div class="flex flex-col gap-sp-4">
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
        placeholder="you@mail.ru"
        autocomplete="email"
        required
      />
    </div>
    <div class="mt-auto flex flex-col items-stretch pt-sp-8">
      <UiButton type="submit" :loading="loading" class="w-full">
        {{ loading ? 'Отправляем…' : 'Прислать ссылку' }}
      </UiButton>
      <NuxtLink
        to="/login"
        class="mt-sp-3 py-sp-3 text-center text-body font-semibold text-accent-text"
      >
        Вспомнил — войти
      </NuxtLink>
    </div>
  </form>

  <div v-else class="flex flex-1 flex-col items-center justify-center pb-sp-12 text-center">
    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-text-2">
      <MailCheck class="h-8 w-8" aria-hidden="true" />
    </span>
    <h1 class="mt-sp-4 text-h2 text-text">Проверьте почту</h1>
    <p class="mt-sp-3 text-body text-text-2">
      Отправили ссылку на {{ email }}. Она действует {{ PASSWORD_RESET_TTL_LABEL }}. Письма нет —
      загляните в «Спам».
    </p>
    <UiAlert
      v-if="errorMessage"
      variant="error"
      class="mt-sp-4 w-full text-left"
      :title="SEND_FAILED_TITLE"
      :message="errorMessage"
    />
    <UiButton to="mailto:" :icon="Mail" class="mt-sp-6">Открыть почту</UiButton>
    <button
      type="button"
      class="mt-sp-12 py-sp-3 text-body font-semibold text-accent-text disabled:opacity-50"
      :disabled="resendTimer.isActive.value || loading"
      data-testid="resend"
      @click="onResend"
    >
      <template v-if="resendTimer.isActive.value">
        Отправить ещё раз · через {{ formatCountdown(resendTimer.remaining.value) }}
      </template>
      <template v-else>{{ loading ? 'Отправляем…' : 'Отправить ещё раз' }}</template>
    </button>
  </div>
</template>
