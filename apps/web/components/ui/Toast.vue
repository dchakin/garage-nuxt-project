<script setup lang="ts">
/**
 * Вывод toast из `useToast()` — один экземпляр в `app.vue`. Плашка снизу над нижней панелью
 * (отступ — CSS-переменная `--toast-bottom`, по умолчанию 16 px, + safe-area). Таймер на паузе,
 * пока палец на toast или фокус на «Отменить». Новый toast вытесняет старый: старый уходит за 84 мс.
 */
import { ref, watch } from 'vue'
import { CircleCheck } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { current, pause, resume, runAction } = useToast()

const replacing = ref(false)
watch(current, (next, previous) => {
  replacing.value = Boolean(next && previous)
})
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-sp-4"
    style="bottom: calc(var(--toast-bottom, var(--sp-4)) + env(safe-area-inset-bottom))"
  >
    <Transition
      name="toast"
      mode="out-in"
      :leave-active-class="replacing ? 'toast-leave-active toast-replaced' : 'toast-leave-active'"
    >
      <div
        v-if="current"
        :key="current.id"
        class="pointer-events-auto flex w-full max-w-[448px] items-center gap-sp-3 rounded-lg bg-inverse py-1.5 pl-sp-4 pr-1.5 shadow-md"
        :class="current.action ? '' : 'min-h-[56px]'"
        data-testid="toast"
        @pointerdown="pause"
        @pointerup="resume"
        @pointercancel="resume"
        @pointerleave="resume"
        @focusin="pause"
        @focusout="resume"
      >
        <component
          :is="current.icon ?? CircleCheck"
          v-if="current.icon !== null"
          class="h-5 w-5 shrink-0 text-inverse-success"
          aria-hidden="true"
        />
        <p class="min-w-0 flex-1 py-sp-2 text-body font-medium text-on-inverse">
          {{ current.message }}
        </p>
        <button
          v-if="current.action"
          type="button"
          class="h-tap-min shrink-0 rounded-[14px] px-sp-3 text-body font-semibold text-inverse-accent transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring active:opacity-70"
          @click="runAction"
        >
          {{ current.action.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>
