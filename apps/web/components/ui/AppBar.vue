<script setup lang="ts">
/**
 * Шапка экрана (макет «07», AppBar/Car и AppBar/Back). Внутри машины — `car`: название + госномер
 * (тап → `switch`, переключатель машин), справа аватар → профиль. Вне машины и в формах — `back`:
 * стрелка «Назад» + заголовок, справа слот `action` («Готово»). Отступ сверху — safe-area.
 * Положение (sticky/fixed) задаёт layout.
 */
import { resolveComponent } from 'vue'
import { ArrowLeft, ChevronDown } from 'lucide-vue-next'
import UiAvatar from '~/components/ui/Avatar.vue'
import UiIconButton from '~/components/ui/IconButton.vue'
import UiPlate from '~/components/ui/Plate.vue'

const props = withDefaults(
  defineProps<{
    variant: 'car' | 'back'
    /** back: заголовок экрана */
    title?: string
    /** back: ссылка «Назад»; без неё кнопка эмитит `back` */
    backTo?: string
    /** car: «Toyota Camry» */
    carName?: string
    /** car: госномер как ввёл пользователь */
    plateNumber?: string | null
    /** car: имя пользователя для аватара */
    userName?: string
    /** car: куда ведёт аватар */
    profileTo?: string
  }>(),
  {
    title: '',
    backTo: undefined,
    carName: '',
    plateNumber: null,
    userName: '',
    profileTo: '/profile',
  },
)

const emit = defineEmits<{ switch: []; back: [] }>()

const NuxtLink = props.variant === 'car' ? resolveComponent('NuxtLink') : null
</script>

<template>
  <header class="bg-bg pt-[env(safe-area-inset-top)]">
    <div
      v-if="variant === 'car'"
      class="flex h-16 items-center justify-between gap-sp-2 pl-sp-5 pr-sp-3"
    >
      <button
        type="button"
        class="-ml-sp-2 flex min-w-0 flex-col items-start gap-1 rounded-md px-sp-2 py-1 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring active:bg-surface-3"
        aria-haspopup="dialog"
        :aria-label="`Сменить машину: ${carName}`"
        @click="emit('switch')"
      >
        <span class="flex max-w-full items-center gap-1">
          <span class="truncate text-h2 font-bold text-text">{{ carName }}</span>
          <ChevronDown class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
        </span>
        <UiPlate v-if="plateNumber" :plate-number="plateNumber" />
      </button>
      <slot name="action">
        <component
          :is="NuxtLink"
          :to="profileTo"
          aria-label="Профиль"
          title="Профиль"
          class="inline-flex h-tap-min w-tap-min shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
        >
          <UiAvatar :name="userName" />
        </component>
      </slot>
    </div>
    <div v-else class="flex h-14 items-center gap-1 px-sp-2">
      <UiIconButton :icon="ArrowLeft" label="Назад" :to="backTo" @click="!backTo && emit('back')" />
      <h1 class="min-w-0 flex-1 truncate text-h3 text-text">{{ title }}</h1>
      <slot name="action" />
    </div>
  </header>
</template>
