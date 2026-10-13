<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
const { supported, permission, subscribed, busy, needsInstall, subscribe, unsubscribe, sendTest } =
  usePush()
const message = ref('')
const error = ref('')

async function run(action: () => Promise<unknown>, success = '') {
  message.value = ''
  error.value = ''
  try {
    await action()
    message.value = success
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Что-то пошло не так'
  }
}

async function onEnable() {
  await run(async () => {
    const ok = await subscribe()
    if (!ok) throw new Error('Разрешение на уведомления не выдано')
  }, 'Уведомления включены')
}
</script>

<template>
  <ClientOnly>
    <div class="card p-4 mb-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="flex items-center gap-1.5 font-medium text-text">
            <Bell class="h-5 w-5 text-text-2" aria-hidden="true" />
            Push-уведомления
          </p>
          <p class="text-sm text-text-2">
            <template v-if="needsInstall"
              >На iPhone сначала добавьте приложение на экран «Домой» (Поделиться → На экран
              «Домой»)</template
            >
            <template v-else-if="!supported">Браузер не поддерживает push-уведомления</template>
            <template v-else-if="permission === 'denied'"
              >Уведомления запрещены в настройках браузера</template
            >
            <template v-else-if="subscribed">Включены на этом устройстве</template>
            <template v-else>Напомним, когда подойдёт срок ТО или замены расходников</template>
          </p>
        </div>
        <template v-if="supported && !needsInstall && permission !== 'denied'">
          <UiButton v-if="!subscribed" size="sm" :loading="busy" @click="onEnable">
            Включить
          </UiButton>
          <UiButton
            v-else
            variant="secondary"
            size="sm"
            :disabled="busy"
            @click="run(unsubscribe, 'Уведомления выключены')"
          >
            Выключить
          </UiButton>
        </template>
      </div>
      <button
        v-if="subscribed"
        :disabled="busy"
        class="link text-sm mt-2"
        @click="run(sendTest, 'Тестовое уведомление отправлено')"
      >
        Отправить тестовое уведомление
      </button>
      <p v-if="message" class="alert-success mt-2">{{ message }}</p>
      <p v-if="error" class="alert-error mt-2">{{ error }}</p>
    </div>
  </ClientOnly>
</template>
