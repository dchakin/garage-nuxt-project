<script setup lang="ts">
/**
 * Участники машины (З2): владелец и приглашённые с ролями. Владелец в `carMembers` не хранится —
 * его строка строится из `ownerName` (для текущего пользователя — «вы» и его email).
 * Ниже — форма добавления по email: коды ошибок API (`user_not_found`, `already_member`)
 * переводятся здесь, запрос выполняет родитель.
 */
import type { CarMember } from '@garage/shared/types'

const props = defineProps<{
  ownerName: string
  /** Email владельца известен, только когда владелец — текущий пользователь */
  ownerEmail?: string
  isOwnerYou: boolean
  members: CarMember[]
  /** Можно ли добавлять участников (только владелец) */
  canInvite?: boolean
  inviting?: boolean
  inviteError?: string
}>()
const emit = defineEmits<{ invite: [email: string] }>()

const email = ref('')

const ownerLabel = computed(() => (props.isOwnerYou ? `${props.ownerName} (вы)` : props.ownerName))

function onSubmit() {
  const value = email.value.trim()
  if (value) emit('invite', value)
}

/** Очистить поле после успешного приглашения */
function reset() {
  email.value = ''
}

defineExpose({ reset })
</script>

<template>
  <div class="flex flex-col gap-sp-3">
    <UiCard tag="ul" aria-label="Участники" data-testid="members-list">
      <li class="flex min-h-14 items-center gap-sp-3 bg-surface px-sp-4 py-sp-2">
        <UiAvatar :name="ownerName" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-body text-text">{{ ownerLabel }}</p>
          <p v-if="ownerEmail" class="truncate text-sm text-text-2">{{ ownerEmail }}</p>
        </div>
        <span class="shrink-0 text-sm text-text-2">Владелец</span>
      </li>
      <li
        v-for="member in members"
        :key="member.id"
        class="flex min-h-14 items-center gap-sp-3 bg-surface px-sp-4 py-sp-2"
      >
        <UiAvatar :name="member.user.name" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-body text-text">{{ member.user.name }}</p>
          <p class="truncate text-sm text-text-2">{{ member.user.email }}</p>
        </div>
        <span class="shrink-0 text-sm text-text-2">Участник</span>
      </li>
    </UiCard>

    <form v-if="canInvite" class="flex flex-col gap-sp-3" @submit.prevent="onSubmit">
      <UiField
        v-model="email"
        type="email"
        label="Email участника"
        placeholder="sergey@mail.ru"
        autocomplete="off"
        :error="inviteError"
      />
      <UiButton type="submit" variant="tonal" :loading="inviting" :disabled="!email.trim()">
        {{ inviting ? 'Добавляем…' : 'Добавить участника' }}
      </UiButton>
    </form>
  </div>
</template>
