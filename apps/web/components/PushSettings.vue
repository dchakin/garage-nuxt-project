<script setup lang="ts">
/**
 * Блок «Уведомления» профиля (З1): переключатель push на этом устройстве и тестовое уведомление.
 * Подзаголовок показывает, почему включить нельзя: iOS не в PWA, нет VAPID, браузер без push, запрет.
 * Явные импорты — тест монтирует компонент без Nuxt (`tests/ui/pushSettings.test.ts`).
 */
import { computed, ref } from 'vue'
import { Send } from 'lucide-vue-next'
import UiAlert from '~/components/ui/Alert.vue'
import UiCard from '~/components/ui/Card.vue'
import UiRowSetting from '~/components/ui/RowSetting.vue'
import UiRowToggle from '~/components/ui/RowToggle.vue'
import { usePush } from '~/composables/usePush'
import { useToast } from '~/composables/useToast'

const {
  supported,
  vapidMissing,
  permission,
  subscribed,
  busy,
  needsInstall,
  subscribe,
  unsubscribe,
  sendTest,
} = usePush()
const { show } = useToast()
const error = ref('')

const canToggle = computed(
  () => supported.value && !needsInstall.value && permission.value !== 'denied',
)

const subtitle = computed(() => {
  if (needsInstall.value)
    return 'На iPhone сначала добавьте приложение на экран «Домой» (Поделиться → На экран «Домой»)'
  if (vapidMissing.value) return 'Уведомления не настроены на сервере'
  if (!supported.value) return 'Браузер не поддерживает push-уведомления'
  if (permission.value === 'denied') return 'Уведомления запрещены в настройках браузера'
  if (subscribed.value) return 'Включены на этом устройстве'
  return 'Напомним, когда подойдёт срок ТО или замены расходников'
})

async function run(action: () => Promise<unknown>, success: string) {
  error.value = ''
  try {
    await action()
    show({ message: success })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Что-то пошло не так'
  }
}

async function enable() {
  await run(async () => {
    const ok = await subscribe()
    if (!ok) throw new Error('Разрешение на уведомления не выдано')
  }, 'Уведомления включены')
}

function onToggle(enabled: boolean) {
  if (busy.value) return
  return enabled ? enable() : run(unsubscribe, 'Уведомления выключены')
}

function onSendTest() {
  if (busy.value) return
  return run(sendTest, 'Тестовое уведомление отправлено')
}
</script>

<template>
  <UiCard>
    <UiRowToggle
      title="Push-уведомления"
      :subtitle="subtitle"
      :model-value="subscribed"
      :disabled="!canToggle || busy"
      @update:model-value="onToggle"
    />
    <UiRowSetting v-if="subscribed" :icon="Send" label="Отправить тестовое" @click="onSendTest" />
    <div v-if="error" class="p-sp-3">
      <UiAlert variant="error" title="Не получилось" :message="error" />
    </div>
  </UiCard>
</template>
