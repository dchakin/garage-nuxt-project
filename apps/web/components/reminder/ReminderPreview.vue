<script setup lang="ts">
/**
 * Предпросмотр срока нового напоминания (Е1/Е2): «Следующий раз — на 97 450 км или 12 сент 2027».
 * Срок уже позади — `UiAlert` «Срок уже прошёл».
 */
import { computed } from 'vue'
import type { ReminderPreview } from '@garage/shared/utils/reminderPreview'
import { describeNextDue } from '@garage/shared/utils/reminderNextDue'
import UiAlert from '~/components/ui/Alert.vue'

const props = defineProps<{ preview: ReminderPreview | null; today?: string }>()

const dueText = computed(() => (props.preview ? describeNextDue(props.preview, props.today) : null))
</script>

<template>
  <div class="flex flex-col gap-sp-3" data-testid="reminder-preview">
    <div class="rounded-md bg-surface-2 px-sp-4 py-sp-3">
      <p class="text-sm text-text-2">Следующий раз</p>
      <p class="mt-0.5 text-h3 text-text">
        {{ dueText ?? 'Укажите интервал — покажем срок' }}
      </p>
    </div>
    <UiAlert
      v-if="preview?.isOverdue"
      variant="warning"
      title="Срок уже прошёл"
      message="Напоминание сразу окажется в «Просрочено». Отметьте «Сделал», когда выполните."
    />
  </div>
</template>
