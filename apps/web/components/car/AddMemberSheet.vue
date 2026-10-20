<script setup lang="ts">
/**
 * Шторка «Пригласить участника» (И1, И8, И9): объяснение прав и поле email. Коды ошибок API
 * (`user_not_found` → И8, `already_member` → И9) переводятся здесь. «Добавить» неактивна, пока
 * email не изменён после ошибки. При И8 предлагается поделиться ссылкой на приложение:
 * `navigator.share`, иначе копирование ссылки и toast.
 */
import { computed, ref, watch } from 'vue'
import { Share2 } from 'lucide-vue-next'
import { inviteSchema } from '@garage/shared/schemas/car'
import type { CarMember } from '@garage/shared/types'

const FORM_ID = 'add-member-form'
const SHARE_TITLE = 'Гараж'
const SHARE_TEXT = 'Заходи в «Гараж» — вместе следим за обслуживанием машины.'

const props = defineProps<{
  carId: number
  ownerName: string
  /** Email владельца — известен, когда владелец и есть текущий пользователь */
  ownerEmail?: string
  members: CarMember[]
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ added: [] }>()

const toast = useToast()

type InviteFailure = 'not_found' | 'already_member' | 'other'

const email = ref('')
const inviting = ref(false)
const failure = ref<InviteFailure | null>(null)
/** Email, на котором случилась ошибка: пока он не изменён, повторять запрос бессмысленно */
const failedEmail = ref('')
const failureMessage = ref('')

const trimmedEmail = computed(() => email.value.trim())
const canSubmit = computed(
  () => !!trimmedEmail.value && trimmedEmail.value !== failedEmail.value && !inviting.value,
)

function findKnownName(value: string): string | null {
  const normalized = value.toLowerCase()
  const member = props.members.find((item) => item.user.email.toLowerCase() === normalized)
  if (member) return member.user.name
  if (props.ownerEmail?.toLowerCase() === normalized) return props.ownerName
  return null
}

function fail(kind: InviteFailure, message: string) {
  failure.value = kind
  failureMessage.value = message
  failedEmail.value = trimmedEmail.value
}

function describeFailure(error: any) {
  const code = error?.data?.statusMessage
  if (code === 'user_not_found') {
    fail('not_found', 'Пользователь с таким email не найден')
  } else if (code === 'already_member') {
    const name = findKnownName(trimmedEmail.value) ?? 'Этот пользователь'
    fail('already_member', `${name} уже участник этой машины`)
  } else {
    fail('other', 'Не удалось добавить участника')
  }
}

watch(open, (opened) => {
  if (!opened) return
  email.value = ''
  failure.value = null
  failedEmail.value = ''
  failureMessage.value = ''
})

async function submit() {
  if (!canSubmit.value) return
  const parsed = inviteSchema.safeParse({ email: trimmedEmail.value })
  if (!parsed.success) {
    fail('other', 'Введите email в формате name@mail.ru')
    return
  }
  failure.value = null
  failureMessage.value = ''
  inviting.value = true
  try {
    await $fetch(`/api/cars/${props.carId}/invite`, {
      method: 'POST',
      body: { email: trimmedEmail.value },
    })
  } catch (error: any) {
    describeFailure(error)
    return
  } finally {
    inviting.value = false
  }
  open.value = false
  emit('added')
}

async function shareApp() {
  const url = window.location.origin
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url })
    } catch {
      // Пользователь закрыл окно «Поделиться» — ничего делать не нужно
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    toast.show({ message: 'Ссылка скопирована' })
  } catch {
    toast.show({ message: 'Не удалось скопировать ссылку', icon: null })
  }
}
</script>

<template>
  <UiSheet v-model:open="open" title="Пригласить участника">
    <form :id="FORM_ID" class="flex flex-col gap-sp-4 pb-sp-2" novalidate @submit.prevent="submit">
      <p class="text-body text-text-2" data-testid="add-member-rights">
        Участник видит записи и напоминания этой машины, добавляет записи и обновляет пробег. Данные
        машины, участников и удаление остаются у владельца.
      </p>
      <UiField
        v-model="email"
        type="email"
        label="Email участника"
        placeholder="sergey@mail.ru"
        autocomplete="off"
        autofocus
        :error="failureMessage || undefined"
      />
      <UiAlert
        v-if="failure === 'not_found'"
        variant="info"
        title="Его ещё нет в «Гараже»"
        message="Отправьте ссылку на приложение — после регистрации с этим email его можно будет добавить."
      >
        <template #actions>
          <UiButton variant="tonal" size="sm" :icon="Share2" @click="shareApp">
            Поделиться ссылкой на приложение
          </UiButton>
        </template>
      </UiAlert>
    </form>
    <template #footer>
      <UiButton
        type="submit"
        :form="FORM_ID"
        class="w-full"
        :loading="inviting"
        :disabled="!canSubmit"
      >
        {{ inviting ? 'Добавляем…' : 'Добавить' }}
      </UiButton>
    </template>
  </UiSheet>
</template>
