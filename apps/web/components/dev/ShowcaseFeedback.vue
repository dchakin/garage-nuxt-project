<script setup lang="ts">
// Тексты — как во фрейме «07 · Компоненты: навигация и оверлеи» (группа «Алерты и пустые состояния»)
// и на экранах Д2, В6, Б3
import { NotebookPen, Plus, RefreshCw, TriangleAlert, WifiOff } from 'lucide-vue-next'

const { show } = useToast()
const bridgeOn = ref(true)
const disclosureOpen = ref(false)
const undoCount = ref(0)

function showDeletedToast() {
  show({
    message: 'Запись удалена',
    action: { label: 'Отменить', onClick: () => undoCount.value++ },
  })
}

function showAddedToast() {
  show({ message: 'Запись добавлена' })
}
</script>

<template>
  <div class="space-y-sp-8">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Всплывашка</h2>
      <div class="flex flex-wrap gap-sp-3">
        <UiButton variant="secondary" @click="showDeletedToast">Toast с «Отменить»</UiButton>
        <UiButton variant="secondary" @click="showAddedToast">Toast без действия</UiButton>
      </div>
      <p class="text-sm text-text-2" data-testid="undo-count">Отменено: {{ undoCount }}</p>
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Алерты</h2>
      <UiAlert
        variant="error"
        title="Не удалось сохранить"
        message="Нет связи с сервером. Данные не потеряны — попробуйте ещё раз."
      />
      <UiAlert variant="warning" title="2 срока просрочены" message="Замена масла и техосмотр." />
      <UiAlert
        variant="success"
        title="Push включены"
        message="Напомним за 14 дней или за 500 км."
      />
      <UiAlert
        variant="info"
        title="Только на экране «Домой»"
        message="На iPhone push работают в установленном приложении: Поделиться → На экран «Домой»."
      />
      <UiAlert
        variant="warning"
        :icon="WifiOff"
        title="Нет соединения"
        message="Показываем данные на 9:12. Новые записи сохранятся на телефоне и отправятся, когда появится сеть."
      />
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Пустые состояния</h2>
      <UiCard>
        <UiEmptyState
          :icon="NotebookPen"
          title="Записей пока нет"
          message="Добавляйте ТО, ремонты и покупки — здесь появится история машины и итоги по месяцам."
        >
          <template #action>
            <UiButton :icon="Plus">Добавить запись</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
      <UiCard>
        <UiEmptyState
          :icon="TriangleAlert"
          tone="danger"
          title="Не удалось загрузить журнал"
          message="Сервер не ответил. Ваши записи в безопасности — попробуйте ещё раз через минуту."
        >
          <template #action>
            <UiButton :icon="RefreshCw">Повторить</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Мостик и раскрытие</h2>
      <UiReminderBridge
        v-model="bridgeOn"
        title="Закрыть «Замена масла»"
        subtitle="Следующая — на 97 450 км или 10 окт 2027"
      />
      <UiDisclosure v-model:open="disclosureOpen" label="Категория, место, заметка">
        <div class="space-y-sp-4">
          <UiField label="Место" placeholder="Сервис на Ленина" />
          <UiTextarea label="Комментарий" :maxlength="500" />
        </div>
      </UiDisclosure>
    </div>
  </div>
</template>
