<script setup lang="ts">
/**
 * Шторка снизу — контейнер для форм (запись, пробег, напоминание, участник, переключатель машин).
 * Закрытие: тап по затемнению, «×», Esc, свайп вниз за шапку. Кнопка действия — слот `footer`,
 * прибита к низу. Фокус переходит внутрь после анимации появления (`[autofocus]` или панель)
 * и возвращается на открывший элемент.
 */
import { computed, ref, useId } from 'vue'
import { X } from 'lucide-vue-next'
import IconButton from './IconButton.vue'
import { useModalOverlay } from '~/composables/useModalOverlay'
import { useSheetSwipe } from '~/composables/useSheetSwipe'

defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })

const panel = ref<HTMLElement | null>(null)
const titleId = useId()

function close() {
  open.value = false
}

const { focusInitial } = useModalOverlay({ open, panel, onEscape: close })
const { offset, dragging, onPointerDown, reset } = useSheetSwipe({ panel, onClose: close })

const panelStyle = computed(() => (offset.value ? { translate: `0 ${offset.value}px` } : undefined))
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet" appear @after-enter="focusInitial" @after-leave="reset">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="overlay-scrim absolute inset-0 bg-scrim" aria-hidden="true" @click="close" />
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="overlay-panel relative flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-xl bg-surface shadow-lg outline-none"
          :class="
            dragging
              ? ''
              : 'transition-[translate] duration-base ease-standard motion-reduce:transition-none'
          "
          :style="panelStyle"
          data-testid="sheet"
        >
          <header class="shrink-0 cursor-grab touch-none select-none" @pointerdown="onPointerDown">
            <div class="mx-auto mt-sp-2 h-1 w-9 rounded-full bg-border-strong" aria-hidden="true" />
            <div class="flex items-center gap-sp-3 py-sp-2 pl-sp-5 pr-sp-3">
              <h2 :id="titleId" class="min-w-0 flex-1 truncate text-h2 text-text">{{ title }}</h2>
              <IconButton
                :icon="X"
                label="Закрыть"
                variant="filled"
                class="!rounded-full"
                @click="close"
              />
            </div>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-sp-5 pb-sp-4">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="shrink-0 border-t border-border px-sp-5 pb-[calc(var(--sp-4)+env(safe-area-inset-bottom))] pt-sp-4"
          >
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
