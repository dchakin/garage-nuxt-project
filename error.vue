<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

const { clear } = useUserSession()

const statusCode = computed(() => props.error?.statusCode ?? 500)

const content = computed(() => {
  switch (statusCode.value) {
    case 401:
      return {
        emoji: '🔒',
        title: 'Сессия истекла',
        text: 'Похоже, вы вышли из системы или сессия устарела. Войдите заново, чтобы продолжить.'
      }
    case 403:
      return {
        emoji: '⛔',
        title: 'Нет доступа',
        text: 'У вас нет прав для просмотра этой страницы или автомобиля.'
      }
    case 404:
      return {
        emoji: '🔍',
        title: 'Страница не найдена',
        text: 'Такой страницы не существует или она была удалена.'
      }
    default:
      return {
        emoji: '⚠️',
        title: 'Что-то пошло не так',
        text: props.error?.statusMessage || props.error?.message || 'Произошла непредвиденная ошибка.'
      }
  }
})

async function goToLogin() {
  await clear()
  await clearError({ redirect: '/login' })
}

async function goHome() {
  await clearError({ redirect: '/cars' })
}
</script>

<template>
  <div class="max-w-sm mx-auto mt-16 text-center">
    <div class="flex justify-center mb-4">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white text-xl">
        {{ content.emoji }}
      </span>
    </div>
    <h1 class="text-xl font-semibold text-slate-800 mb-2">{{ content.title }}</h1>
    <p class="text-sm text-slate-500 mb-6">{{ content.text }}</p>

    <div class="card p-6 shadow-sm space-y-3">
      <button v-if="statusCode === 401" class="btn-primary w-full py-2" @click="goToLogin">
        Войти заново
      </button>
      <button v-else class="btn-primary w-full py-2" @click="goHome">
        На главную
      </button>
    </div>
  </div>
</template>
