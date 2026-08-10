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
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
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
          <div v-if="dialog.open" class="card w-full max-w-sm p-5 shadow-xl" role="alertdialog" aria-modal="true">
            <h2 class="font-semibold text-slate-800">{{ dialog.title }}</h2>
            <p class="text-sm text-slate-600 mt-1.5">{{ dialog.message }}</p>
            <div class="flex justify-end gap-2 mt-5">
              <button class="btn-secondary px-3 py-1.5 text-sm" @click="respond(false)">
                {{ dialog.cancelText }}
              </button>
              <button
                class="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium px-3 py-1.5 text-sm transition-colors"
                :class="dialog.danger
                  ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'"
                @click="respond(true)"
              >
                {{ dialog.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
