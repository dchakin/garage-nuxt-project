<script setup lang="ts">
/**
 * Плашка «Машина добавлена» на первом «Обзоре» после мастера (А6) и под ней отдельная tonal-кнопка
 * «Включить push» (есть, пока push доступен и не включён). Плашка закрывается «Скрыть»; кнопка
 * живёт рядом с ней (компонент — фрагмент из двух блоков) и уходит вместе с плашкой.
 */
import { computed } from 'vue'
import { Bell, PartyPopper } from 'lucide-vue-next'
import { pluralize } from '@garage/shared/utils/format'
import { usePush } from '~/composables/usePush'
import { useToast } from '~/composables/useToast'
import UiAlert from '~/components/ui/Alert.vue'
import UiButton from '~/components/ui/Button.vue'

const REMINDER_FORMS: [string, string, string] = ['напоминание', 'напоминания', 'напоминаний']

const props = defineProps<{ count: number }>()
const emit = defineEmits<{ dismiss: [] }>()

const { supported, permission, subscribed, busy, needsInstall, subscribe } = usePush()
const { show } = useToast()

const canEnablePush = computed(
  () =>
    supported.value && !needsInstall.value && !subscribed.value && permission.value !== 'denied',
)
const message = computed(() => {
  const created = `Создали ${props.count} ${pluralize(props.count, REMINDER_FORMS)}.`
  return canEnablePush.value ? `${created} Включите push, чтобы не пропустить сроки.` : created
})

async function enablePush() {
  try {
    if (await subscribe()) show({ message: 'Push-уведомления включены' })
  } catch {
    show({ message: 'Не удалось включить уведомления', icon: null })
  }
}
</script>

<template>
  <UiAlert
    variant="success"
    :icon="PartyPopper"
    title="Машина добавлена"
    :message="message"
    data-testid="onboarding-banner"
  >
    <template #actions>
      <UiButton variant="text" size="sm" @click="emit('dismiss')">Скрыть</UiButton>
    </template>
  </UiAlert>
  <UiButton
    v-if="canEnablePush"
    variant="tonal"
    :icon="Bell"
    :loading="busy"
    class="w-full"
    data-testid="onboarding-push"
    @click="enablePush"
  >
    Включить push
  </UiButton>
</template>
