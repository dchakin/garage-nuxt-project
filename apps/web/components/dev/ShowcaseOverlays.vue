<script setup lang="ts">
// Тексты — как во фрейме «07 · Компоненты: навигация и оверлеи» (группа «Шторка, диалог, всплывашка»)
import { Trash2 } from 'lucide-vue-next'

const sheetOpen = ref(false)
const dialogOpen = ref(false)
const deleting = ref(false)
const DELETE_DELAY_MS = 600

function onDelete() {
  deleting.value = true
  setTimeout(() => {
    deleting.value = false
    dialogOpen.value = false
  }, DELETE_DELAY_MS)
}
</script>

<template>
  <div class="space-y-sp-3">
    <h2 class="text-h2 text-text">Шторка и диалог</h2>
    <div class="flex flex-wrap gap-sp-3">
      <UiButton variant="secondary" @click="sheetOpen = true">Открыть шторку</UiButton>
      <UiButton variant="secondary" @click="dialogOpen = true">Открыть диалог</UiButton>
    </div>

    <UiSheet v-model:open="sheetOpen" title="Новая запись">
      <p class="text-body text-text-2">Содержимое (слот)</p>
      <template #footer>
        <UiButton class="w-full" @click="sheetOpen = false">Сохранить</UiButton>
      </template>
    </UiSheet>

    <UiDialog
      v-model:open="dialogOpen"
      title="Удалить Toyota Camry?"
      message="Вместе с машиной удалятся 8 записей и 5 напоминаний. Анна потеряет доступ. Это нельзя отменить."
      confirm-text="Удалить"
      :icon="Trash2"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
</template>
