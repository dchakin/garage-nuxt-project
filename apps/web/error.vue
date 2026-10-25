<script setup lang="ts">
/**
 * Экраны ошибок на весь экран: И4 (404), И5 (500), И6 (403), И7 (сессия истекла).
 * 403/404 на машине показывает `useCarUnavailable`, И7 — `plugins/api.ts` при окончательном 401
 * (маршрут лежит в `error.data.redirect`: после входа вернём пользователя на него).
 */
import ErrorScreen from '~/components/errors/ErrorScreen.vue'
import { resolveErrorKind } from '~/utils/errorScreens'
import { loginLocation } from '~/utils/redirectTarget'

const props = defineProps<{
  error: {
    statusCode?: number
    data?: { redirect?: string } | null
  }
}>()

const route = useRoute()
const kind = computed(() => resolveErrorKind(props.error?.statusCode))

async function goToLogin() {
  const redirectTo = props.error?.data?.redirect ?? route.fullPath
  await clearError({ redirect: loginLocation(redirectTo) })
}

async function goToCars() {
  await clearError({ redirect: '/cars' })
}

function retry() {
  window.location.reload()
}
</script>

<template>
  <ErrorScreen :kind="kind">
    <template #actions>
      <template v-if="kind === 'session-expired'">
        <UiButton class="w-full" @click="goToLogin">Войти</UiButton>
      </template>
      <template v-else-if="kind === 'server'">
        <UiButton class="w-full" @click="retry">Повторить</UiButton>
        <UiButton variant="text" class="w-full" @click="goToCars">К моим машинам</UiButton>
      </template>
      <UiButton v-else class="w-full" @click="goToCars">К моим машинам</UiButton>
    </template>
  </ErrorScreen>
</template>
