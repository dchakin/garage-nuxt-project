import type { Component } from 'vue'
import type { EntryType } from '@garage/shared/schemas/entry'
import { CalendarCheck, Ellipsis, RefreshCw, ShoppingCart, Wrench } from 'lucide-vue-next'

interface EntryTypeIcon {
  icon: Component
  /** Цвет иконки */
  colorClass: string
  /** Мягкий фон плитки под иконкой */
  softClass: string
}

/** Иконка и цвет типа записи (design/garage.pen, «04 · Иконки» → «Типы записей»). */
export const entryTypeIcons: Record<EntryType, EntryTypeIcon> = {
  maintenance: {
    icon: CalendarCheck,
    colorClass: 'text-type-service',
    softClass: 'bg-type-service-soft',
  },
  repair: { icon: Wrench, colorClass: 'text-type-repair', softClass: 'bg-type-repair-soft' },
  replacement: {
    icon: RefreshCw,
    colorClass: 'text-type-replace',
    softClass: 'bg-type-replace-soft',
  },
  purchase: {
    icon: ShoppingCart,
    colorClass: 'text-type-purchase',
    softClass: 'bg-type-purchase-soft',
  },
  other: { icon: Ellipsis, colorClass: 'text-type-other', softClass: 'bg-type-other-soft' },
}
