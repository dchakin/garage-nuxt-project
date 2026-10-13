<script setup lang="ts">
import { entryTypeLabels, entryTypes } from '@garage/shared/schemas/entry'
import type { ReminderStatus } from '@garage/shared/types'

// Значения — как во фрейме «06 · Компоненты: данные»
const STATUSES: ReminderStatus[] = ['overdue', 'soon', 'ok', 'inactive']
</script>

<template>
  <div class="space-y-sp-8">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Бейджи</h2>
      <div class="flex flex-wrap items-center gap-sp-4">
        <span
          v-for="type in entryTypes"
          :key="type"
          class="flex flex-col items-center gap-1 text-xs text-text-2"
        >
          <UiTypeBadge :type="type" />
          {{ entryTypeLabels[type] }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-sp-3">
        <UiStatusBadge v-for="status in STATUSES" :key="status" :status="status" />
        <UiStatusBadge status="overdue">2 просрочено</UiStatusBadge>
      </div>
      <div class="flex flex-wrap items-center gap-sp-4">
        <UiCounter :count="3" />
        <UiCounter :count="120" />
        <UiAvatar name="Дмитрий" />
        <UiPlate plate-number="А123ВС77" />
        <span class="text-accent"><UiSpinner size="md" /></span>
      </div>
      <div class="space-y-sp-3">
        <UiProgress :value="0.7" tone="soon" label="Прошло до ОСАГО" />
        <UiProgress :value="1" tone="overdue" />
        <UiProgress :value="0.3" tone="ok" />
        <UiProgress :value="0.55" />
      </div>
    </div>
  </div>
</template>
