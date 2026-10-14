<script setup lang="ts">
/**
 * Пустое состояние и ошибка загрузки экрана: отвечает «что здесь будет» и даёт одно действие
 * (слот `action` — `UiButton` «Добавить запись», «Повторить»; без слота — без кнопки).
 */
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    icon: Component
    title: string
    message?: string
    /** danger — ошибка загрузки (В6): красная плитка иконки */
    tone?: 'neutral' | 'danger'
  }>(),
  { message: undefined, tone: 'neutral' },
)
</script>

<template>
  <div class="flex flex-col items-center gap-sp-3 px-sp-6 py-sp-8 text-center">
    <div
      class="flex h-16 w-16 items-center justify-center rounded-full"
      :class="tone === 'danger' ? 'bg-danger-soft text-danger-text' : 'bg-surface-2 text-text-2'"
      aria-hidden="true"
    >
      <component :is="icon" class="h-7 w-7" />
    </div>
    <h2 class="text-h3 text-text">{{ title }}</h2>
    <p v-if="message" class="max-w-[320px] text-body text-text-2">{{ message }}</p>
    <div v-if="$slots.action" class="pt-sp-2">
      <slot name="action" />
    </div>
  </div>
</template>
