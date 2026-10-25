<script setup lang="ts">
/**
 * Экран ошибки на весь экран (И4–И7): иконка, заголовок, пояснение и кнопки в слоте `actions`.
 * Тексты — `errorScreens[kind]`; `message` заменяет пояснение, если нужно уточнить.
 */
import { computed } from 'vue'
import UiEmptyState from '~/components/ui/EmptyState.vue'
import { errorScreens, type ErrorKind } from '~/utils/errorScreens'

const props = withDefaults(defineProps<{ kind: ErrorKind; message?: string }>(), {
  message: undefined,
})

const content = computed(() => errorScreens[props.kind])
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-bg px-sp-4" :data-error-kind="kind">
    <UiEmptyState
      :icon="content.icon"
      :title="content.title"
      :message="message ?? content.message"
      :tone="kind === 'server' ? 'danger' : 'neutral'"
    >
      <template #action>
        <div class="flex flex-col items-stretch gap-sp-2">
          <slot name="actions" />
        </div>
      </template>
    </UiEmptyState>
  </main>
</template>
