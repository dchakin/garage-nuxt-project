<script setup lang="ts">
const { dialog, respond } = useConfirmDialog()

function onKeydown(e: KeyboardEvent) {
  if (!dialog.value.open) return
  if (e.key === 'Escape') respond(false)
  if (e.key === 'Enter') respond(true)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="dialog.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
        @click.self="respond(false)"
      >
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="dialog.open"
            class="card w-full max-w-sm p-5 shadow-lg"
            role="alertdialog"
            aria-modal="true"
          >
            <h2 class="font-semibold text-text">{{ dialog.title }}</h2>
            <p class="text-sm text-text-2 mt-1.5">{{ dialog.message }}</p>
            <div class="flex justify-end gap-2 mt-5">
              <UiButton variant="secondary" size="sm" @click="respond(false)">
                {{ dialog.cancelText }}
              </UiButton>
              <UiButton
                :variant="dialog.danger ? 'danger' : 'primary'"
                size="sm"
                @click="respond(true)"
              >
                {{ dialog.confirmText }}
              </UiButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
