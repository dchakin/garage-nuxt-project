<script setup lang="ts">
/**
 * Шаблоны напоминаний (Е1) и «Своё» (Е2) одной группой чипов. Уже созданные по названию
 * шаблона помечены галочкой `check`; выбранный чип — в `v-model`.
 */
import { Check, PenLine } from 'lucide-vue-next'
import {
  CUSTOM_REMINDER_CHOICE,
  reminderTemplates,
  type ReminderTemplateChoice,
  type ReminderTemplateId,
} from '@garage/shared/utils/reminderTemplates'
import UiChip from '~/components/ui/Chip.vue'

defineProps<{
  /** Шаблоны, напоминание с таким названием у машины уже есть */
  createdIds: readonly ReminderTemplateId[]
  disabled?: boolean
}>()

const model = defineModel<ReminderTemplateChoice | null>({ default: null })
</script>

<template>
  <div role="group" aria-label="Шаблоны" class="flex flex-wrap gap-sp-2">
    <UiChip
      v-for="template in reminderTemplates"
      :key="template.id"
      :selected="model === template.id"
      :icon="createdIds.includes(template.id) ? Check : undefined"
      icon-class="text-success-text"
      :disabled="disabled"
      :data-created="createdIds.includes(template.id) || undefined"
      @click="model = template.id"
    >
      {{ template.title }}
      <span v-if="createdIds.includes(template.id)" class="sr-only"> — уже создано</span>
    </UiChip>
    <UiChip
      :selected="model === CUSTOM_REMINDER_CHOICE"
      :icon="PenLine"
      :disabled="disabled"
      @click="model = CUSTOM_REMINDER_CHOICE"
    >
      Своё
    </UiChip>
  </div>
</template>
