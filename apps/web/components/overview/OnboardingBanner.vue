<script setup lang="ts">
/**
 * Плашка «Создали N напоминаний» на первом «Обзоре» после мастера (А6): предлагает включить push.
 * Кнопка есть, пока push доступен и не включён; закрывается «Скрыть».
 */
import { computed } from 'vue'
import { PartyPopper } from 'lucide-vue-next'
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

const title = computed(() => `Создали ${props.count} ${pluralize(props.count, REMINDER_FORMS)}`)
const canEnablePush = computed(
  () =>
    supported.value && !needsInstall.value && !subscribed.value && permission.value !== 'denied',
)

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
    :title="title"
    message="Напомним, когда подойдёт срок. Включите push, чтобы не пропустить."
    data-testid="onboarding-banner"
  >
    <template #actions>
      <UiButton v-if="canEnablePush" size="sm" :loading="busy" @click="enablePush">
        Включить push
      </UiButton>
      <UiButton variant="text" size="sm" @click="emit('dismiss')">Скрыть</UiButton>
    </template>
  </UiAlert>
</template>
