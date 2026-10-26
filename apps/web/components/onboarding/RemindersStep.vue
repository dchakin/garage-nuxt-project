<script setup lang="ts">
/**
 * Шаг 2 мастера первого запуска (А5 «Что напоминать?»): переключатели готовых шаблонов
 * (`reminderTemplates`), у каждого «Указать, когда меняли»; у ОСАГО вместо этого сразу
 * «Полис действует до», у шин ничего — срок ставится на ближайший сезон. «Готово» и «Пропустить»
 * прибиты к низу; «назад» рисует страница. Данные хранит страница (`drafts`), ничего не теряется.
 */
import { reminderTemplates, type ReminderTemplate } from '@garage/shared/utils/reminderTemplates'
import {
  describeTemplateRule,
  POLICY_TEMPLATE_ID,
  TIRES_TEMPLATE_ID,
  type TemplateDrafts,
} from '~/utils/onboardingReminders'

defineProps<{
  /** Сегодня (`YYYY-MM-DD`): «когда меняли» не может быть позже */
  today: string
  saving?: boolean
  error?: string
}>()
const drafts = defineModel<TemplateDrafts>({ required: true })
/** `skip` — «Пропустить»: создать только машину, без напоминаний */
const emit = defineEmits<{ skip: []; submit: [] }>()

/** Срок шин — ближайший сезон, «когда меняли» для них не спрашиваем */
function hasLastOption(template: ReminderTemplate): boolean {
  return template.id !== TIRES_TEMPLATE_ID
}
</script>

<template>
  <form class="flex flex-1 flex-col" @submit.prevent="emit('submit')">
    <UiAlert
      v-if="error"
      variant="error"
      title="Не удалось сохранить"
      :message="error"
      class="mb-sp-4"
    />

    <UiCard tag="ul" aria-label="Напоминания">
      <li
        v-for="template in reminderTemplates"
        :key="template.id"
        :data-testid="`onboarding-template-${template.id}`"
      >
        <UiRowToggle
          v-model="drafts[template.id].enabled"
          :title="template.title"
          :subtitle="describeTemplateRule(template, drafts[template.id], today)"
        />
        <div v-if="drafts[template.id].enabled && hasLastOption(template)" class="px-sp-4 pb-sp-2">
          <UiField
            v-if="template.id === POLICY_TEMPLATE_ID"
            v-model="drafts[template.id].validUntil"
            type="date"
            label="Полис действует до"
            pretty-date
            class="pb-sp-2"
          />
          <UiDisclosure v-else label="Указать, когда меняли" centered>
            <div class="flex flex-col gap-sp-3 pb-sp-2">
              <UiField
                v-model="drafts[template.id].lastDate"
                type="date"
                label="Когда меняли"
                pretty-date
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

    <div class="mt-auto flex flex-col items-stretch gap-sp-2 pt-sp-6">
      <UiButton type="submit" :loading="saving" class="w-full">
        {{ saving ? 'Создаём…' : 'Готово' }}
      </UiButton>
      <UiButton variant="text" :disabled="saving" class="w-full" @click="emit('skip')">
        Пропустить
      </UiButton>
    </div>
  </form>
</template>
