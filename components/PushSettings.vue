<script setup lang="ts">
const { supported, permission, subscribed, busy, needsInstall, subscribe, unsubscribe, sendTest } = usePush()
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
          <p class="font-medium text-slate-800">🔔 Push-уведомления</p>
          <p class="text-sm text-slate-500">
            <template v-if="needsInstall">На iPhone сначала добавьте приложение на экран «Домой» (Поделиться → На экран «Домой»)</template>
            <template v-else-if="!supported">Браузер не поддерживает push-уведомления</template>
            <template v-else-if="permission === 'denied'">Уведомления запрещены в настройках браузера</template>
            <template v-else-if="subscribed">Включены на этом устройстве</template>
            <template v-else>Напомним, когда подойдёт срок ТО или замены расходников</template>
          </p>
        </div>
        <template v-if="supported && !needsInstall && permission !== 'denied'">
          <button v-if="!subscribed" :disabled="busy" class="btn-primary px-3 py-1.5 text-sm shrink-0" @click="onEnable">
            <Spinner v-if="busy" /> Включить
          </button>
          <button v-else :disabled="busy" class="btn-secondary px-3 py-1.5 text-sm shrink-0" @click="run(unsubscribe, 'Уведомления выключены')">
            Выключить
          </button>
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
