<script setup lang="ts">
/**
 * Шаг 2 мастера первого запуска (А5 «Что напоминать»): переключатели готовых шаблонов
 * (`reminderTemplates`), у каждого «Указать, когда меняли»; у ОСАГО вместо этого сразу
 * «Полис действует до». Данные хранит страница (`drafts`), поэтому «Назад» ничего не теряет.
 */
import { computed } from 'vue'
import { formatReminderInterval } from '@garage/shared/utils/reminderRemaining'
import { pluralize } from '@garage/shared/utils/format'
import { reminderTemplates } from '@garage/shared/utils/reminderTemplates'
import {
  countEnabledDrafts,
  POLICY_TEMPLATE_ID,
  type TemplateDrafts,
} from '~/utils/onboardingReminders'

const REMINDER_FORMS: [string, string, string] = ['напоминание', 'напоминания', 'напоминаний']

const props = defineProps<{
  /** Сегодня (`YYYY-MM-DD`): «когда меняли» не может быть позже */
  today: string
  saving?: boolean
  error?: string
}>()
const drafts = defineModel<TemplateDrafts>({ required: true })
const emit = defineEmits<{ back: []; submit: [] }>()

const enabledCount = computed(() => countEnabledDrafts(drafts.value))
const submitLabel = computed(() => {
  if (props.saving) return 'Создаём…'
  const count = enabledCount.value
  return count
    ? `Создать ${count} ${pluralize(count, REMINDER_FORMS)}`
    : 'Продолжить без напоминаний'
})
</script>

<template>
  <form class="flex flex-col gap-sp-4" @submit.prevent="emit('submit')">
    <UiAlert v-if="error" variant="error" title="Не удалось сохранить" :message="error" />

    <UiCard tag="ul" aria-label="Напоминания">
      <li
        v-for="template in reminderTemplates"
        :key="template.id"
        :data-testid="`onboarding-template-${template.id}`"
      >
        <UiRowToggle
          v-model="drafts[template.id].enabled"
          :title="template.title"
          :subtitle="formatReminderInterval(template)"
        />
        <div v-if="drafts[template.id].enabled" class="px-sp-4 pb-sp-3">
          <UiField
            v-if="template.id === POLICY_TEMPLATE_ID"
            v-model="drafts[template.id].validUntil"
            type="date"
            label="Полис действует до"
            hint="Не знаете — оставьте пустым, напомним через год"
          />
          <UiDisclosure v-else label="Указать, когда меняли">
            <div class="flex flex-col gap-sp-3 pb-sp-2">
              <UiField
                v-model="drafts[template.id].lastDate"
                type="date"
                label="Когда меняли"
                :max="today"
              />
              <UiField
                v-if="template.intervalKm"
                v-model="drafts[template.id].lastMileage"
                type="number"
                label="Пробег при замене"
                suffix="км"
              />
            </div>
          </UiDisclosure>
        </div>
      </li>
    </UiCard>

    <p class="text-sm text-text-2">
      Остальные напоминания можно добавить позже на вкладке «Напоминания».
    </p>

    <div class="flex gap-sp-3">
      <UiButton variant="secondary" :disabled="saving" class="shrink-0" @click="emit('back')">
        Назад
      </UiButton>
      <UiButton type="submit" :loading="saving" class="flex-1">{{ submitLabel }}</UiButton>
    </div>
  </form>
</template>
