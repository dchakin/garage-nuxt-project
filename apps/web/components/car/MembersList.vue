<script setup lang="ts">
/**
 * Участники машины (З2): владелец и приглашённые с ролями. Владелец в `carMembers` не хранится —
 * его строка строится из `ownerName` (для текущего пользователя — «вы» и его email).
 * Владелец (`canManage`) видит кнопку «Пригласить участника» (шторка И1 — у родителя, событие
 * `add`) и кнопку удаления у каждого участника (диалог подтверждения — у родителя, `remove`).
 */
import { Plus, X } from 'lucide-vue-next'
import type { CarMember } from '@garage/shared/types'

const props = defineProps<{
  ownerName: string
  /** Email владельца известен, только когда владелец — текущий пользователь */
  ownerEmail?: string
  isOwnerYou: boolean
  members: CarMember[]
  /** Можно ли добавлять и удалять участников (только владелец) */
  canManage?: boolean
  /** Участник, чей запрос на удаление сейчас выполняется */
  removingUserId?: number | null
}>()
const emit = defineEmits<{ add: []; remove: [member: CarMember] }>()

const ownerLabel = computed(() => (props.isOwnerYou ? `${props.ownerName} (вы)` : props.ownerName))
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
        class="flex min-h-14 items-center gap-sp-3 bg-surface py-sp-2 pl-sp-4"
        :class="canManage ? 'pr-sp-1' : 'pr-sp-4'"
      >
        <UiAvatar :name="member.user.name" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-body text-text">{{ member.user.name }}</p>
          <p class="truncate text-sm text-text-2">{{ member.user.email }}</p>
        </div>
        <span class="shrink-0 text-sm text-text-2">Участник</span>
        <UiIconButton
          v-if="canManage"
          :icon="X"
          :label="`Убрать участника ${member.user.name}`"
          :disabled="removingUserId === member.user.id"
          @click="emit('remove', member)"
        />
      </li>
    </UiCard>

    <UiButton v-if="canManage" variant="tonal" :icon="Plus" @click="emit('add')">
      Пригласить участника
    </UiButton>
  </div>
</template>
