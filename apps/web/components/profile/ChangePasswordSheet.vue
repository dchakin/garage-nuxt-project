<script setup lang="ts">
/**
 * Шторка «Сменить пароль»: текущий и новый пароль. Неверный текущий (400 от сервера) —
 * ошибка у поля текущего пароля; слишком короткий новый проверяется до запроса.
 */
import { ref, watch } from 'vue'
import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

const FORM_ID = 'change-password-form'
const HTTP_BAD_REQUEST = 400

const open = defineModel<boolean>('open', { required: true })

const { changePassword } = useAuth()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const currentError = ref('')
const newError = ref('')
const formError = ref('')
const saving = ref(false)

watch(open, (opened) => {
  if (!opened) return
  currentPassword.value = ''
  newPassword.value = ''
  currentError.value = ''
  newError.value = ''
  formError.value = ''
})

function validate(): boolean {
  currentError.value = currentPassword.value ? '' : 'Введите текущий пароль'
  newError.value =
    newPassword.value.length >= MIN_PASSWORD_LENGTH ? '' : `Минимум ${MIN_PASSWORD_LENGTH} символов`
  return !currentError.value && !newError.value
}

async function submit() {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
  } catch (error: any) {
    if ((error?.statusCode ?? error?.status) === HTTP_BAD_REQUEST) {
      currentError.value = 'Неверный текущий пароль'
    } else {
      formError.value = 'Не удалось сменить пароль. Попробуйте ещё раз'
    }
    return
  } finally {
    saving.value = false
  }
  open.value = false
  toast.show({ message: 'Пароль изменён' })
}
</script>

<template>
  <UiSheet v-model:open="open" title="Сменить пароль">
    <form :id="FORM_ID" class="flex flex-col gap-sp-4 pb-sp-2" novalidate @submit.prevent="submit">
      <PasswordInput
        v-model="currentPassword"
        label="Текущий пароль"
        autocomplete="current-password"
        autofocus
        :error="currentError || undefined"
      />
      <PasswordInput
        v-model="newPassword"
        label="Новый пароль"
        autocomplete="new-password"
        :hint="`Минимум ${MIN_PASSWORD_LENGTH} символов`"
        :error="newError || undefined"
      />
      <UiAlert v-if="formError" variant="error" title="Пароль не изменён" :message="formError" />
    </form>
    <template #footer>
      <UiButton type="submit" :form="FORM_ID" class="w-full" :loading="saving">
        {{ saving ? 'Сохраняем…' : 'Сменить пароль' }}
      </UiButton>
    </template>
  </UiSheet>
</template>
