<script setup lang="ts">
import type { Reminder } from '~~/shared/types'
import type { ReminderInput } from '~~/shared/schemas/reminder'
import { reminderTriggerTypes, reminderTriggerTypeLabels } from '~~/shared/schemas/reminder'
import { entryTypeLabels } from '~~/shared/schemas/entry'

const props = defineProps<{ carId: number; initial?: Reminder | null; saving?: boolean }>()
const emit = defineEmits<{ submit: [ReminderInput]; cancel: [] }>()

const { categories, fetchCategories } = useCategories()
const { entries, fetchEntries } = useEntries(props.carId)
await Promise.all([fetchCategories(), fetchEntries({ sortBy: 'date', sortDir: 'desc' })])

const form = reactive<ReminderInput>({
  title: props.initial?.title ?? '',
  categoryId: props.initial?.categoryId ?? null,
  triggerType: props.initial?.triggerType ?? 'date',
  intervalMonths: props.initial?.intervalMonths ?? null,
  intervalKm: props.initial?.intervalKm ?? null,
  lastEntryId: props.initial?.lastEntryId ?? null,
  nextDueDate: props.initial?.nextDueDate ?? null,
  nextDueMileage: props.initial?.nextDueMileage ?? null,
  isActive: props.initial?.isActive ?? true
})

const showDate = computed(() => form.triggerType === 'date' || form.triggerType === 'both')
const showMileage = computed(() => form.triggerType === 'mileage' || form.triggerType === 'both')

function entryLabel(entry: (typeof entries.value)[number]) {
  const parts = [entry.date, entryTypeLabels[entry.type]]
  if (entry.mileage != null) parts.push(`${entry.mileage.toLocaleString('ru-RU')} км`)
  return parts.join(' · ')
}

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="onSubmit">
    <div>
      <label class="label">Название</label>
      <input v-model="form.title" placeholder="Например, замена масла" required class="input" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Категория</label>
        <select v-model.number="form.categoryId" class="select">
          <option :value="null">Без категории</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="label">Условие срабатывания</label>
        <select v-model="form.triggerType" class="select">
          <option v-for="t in reminderTriggerTypes" :key="t" :value="t">{{ reminderTriggerTypeLabels[t] }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="label">Привязать к записи журнала</label>
      <select v-model.number="form.lastEntryId" class="select">
        <option :value="null">Не привязывать</option>
        <option v-for="e in entries" :key="e.id" :value="e.id">{{ entryLabel(e) }}</option>
      </select>
      <p class="text-xs text-slate-400 mt-1">
        Если выбрать запись и указать интервал, следующая дата/пробег посчитаются автоматически.
      </p>
    </div>

    <div v-if="showDate" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Интервал, мес.</label>
        <input v-model.number="form.intervalMonths" type="number" min="1" class="input" />
      </div>
      <div>
        <label class="label">Или конкретная дата</label>
        <input v-model="form.nextDueDate" type="date" :disabled="!!form.lastEntryId && !!form.intervalMonths" class="input" />
      </div>
    </div>

    <div v-if="showMileage" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="label">Интервал, км</label>
        <input v-model.number="form.intervalKm" type="number" min="1" class="input" />
      </div>
      <div>
        <label class="label">Или конкретный пробег</label>
        <input
          v-model.number="form.nextDueMileage"
          type="number"
          min="0"
          :disabled="!!form.lastEntryId && !!form.intervalKm"
          class="input"
        />
      </div>
    </div>

    <label class="flex items-center gap-2 text-sm text-slate-600">
      <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
      Активно
    </label>

    <div class="flex gap-3 pt-2">
      <button type="submit" :disabled="saving" class="btn-primary flex-1 py-2">
        <Spinner v-if="saving" />
        {{ saving ? 'Сохранение...' : 'Сохранить' }}
      </button>
      <button type="button" :disabled="saving" class="btn-secondary flex-1 py-2" @click="emit('cancel')">
        Отмена
      </button>
    </div>
  </form>
</template>
