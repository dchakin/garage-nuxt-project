<script setup lang="ts">
/**
 * Плашка «Нет соединения» (Б3) вверху экрана машины: пока сети нет, на экране остаются последние
 * загруженные данные, а плашка говорит, на какой момент они актуальны. Появляется/уходит
 * анимацией высоты `collapse`.
 */
import { WifiOff } from 'lucide-vue-next'
import { formatTime } from '@garage/shared/utils/format'
import { collapseTransitionHooks } from '~/utils/collapseTransition'

const { online, lastOnlineAt } = useOnline()
</script>

<template>
  <Transition name="collapse" v-bind="collapseTransitionHooks">
    <div v-if="!online" class="overflow-hidden" data-testid="offline-banner">
      <div class="pb-sp-4 pt-sp-2">
        <UiAlert
          variant="warning"
          :icon="WifiOff"
          title="Нет соединения"
          :message="`Показываем данные на ${formatTime(lastOnlineAt)}. Изменения станут доступны, когда появится сеть.`"
        />
      </div>
    </div>
  </Transition>
</template>
