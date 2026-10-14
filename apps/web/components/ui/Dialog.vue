<script setup lang="ts">
/**
 * Диалог подтверждения — только для необратимого (удалить машину, аккаунт, выйти).
 * Тап по затемнению не закрывает («09 · Анимации», «Диалог»): закрыть можно «Отменой» или Esc.
 * При открытии фокус — на «Отмене» (безопасное действие), при закрытии возвращается назад.
 * Текст — `message` или слот по умолчанию.
 */
import { ref, useId, type Component } from 'vue'
import Button from './Button.vue'
import { useModalOverlay } from '~/composables/useModalOverlay'

const props = withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmText: string
    cancelText?: string
    /** Плитка с иконкой над заголовком (`Trash2` для удаления) */
    icon?: Component
    /** danger — красная кнопка подтверждения и плитка иконки; primary — обычное действие */
    variant?: 'danger' | 'primary'
    /** Запрос выполняется: кнопки неактивны, Esc не закрывает */
    loading?: boolean
  }>(),
  { message: undefined, cancelText: 'Отмена', icon: undefined, variant: 'danger' },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const messageId = useId()

function cancel() {
  if (props.loading) return
  open.value = false
  emit('cancel')
}

const { focusInitial } = useModalOverlay({
  open,
  panel,
  onEscape: cancel,
  initialFocus: '[data-dialog-cancel]',
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog" appear @after-enter="focusInitial">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-sp-6">
        <div class="overlay-scrim absolute inset-0 bg-scrim" aria-hidden="true" />
        <section
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="message || $slots.default ? messageId : undefined"
          tabindex="-1"
          class="overlay-panel relative w-full max-w-[340px] rounded-xl bg-surface p-sp-5 shadow-lg outline-none"
          data-testid="dialog"
        >
          <div
            v-if="icon"
            class="mb-sp-4 flex h-11 w-11 items-center justify-center rounded-full"
            :class="
              variant === 'danger' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent'
            "
            aria-hidden="true"
          >
            <component :is="icon" class="h-5 w-5" />
          </div>
          <h2 :id="titleId" class="text-h2 text-text">{{ title }}</h2>
          <div :id="messageId" class="mt-sp-2 text-sm text-text-2">
            <slot>{{ message }}</slot>
          </div>
          <div class="mt-sp-5 grid grid-cols-2 gap-sp-3">
            <Button variant="secondary" :disabled="loading" data-dialog-cancel @click="cancel">
              {{ cancelText }}
            </Button>
            <Button :variant="variant" :loading="loading" @click="emit('confirm')">
              {{ confirmText }}
            </Button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
