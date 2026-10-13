import type { Component } from 'vue'
import type { EntryType } from '@garage/shared/schemas/entry'
import { CalendarCheck, Ellipsis, RefreshCw, ShoppingCart, Wrench } from 'lucide-vue-next'

/** Иконка и цвет типа записи (design/garage.pen, «04 · Иконки» → «Типы записей»). */
export const entryTypeIcons: Record<EntryType, { icon: Component; colorClass: string }> = {
  maintenance: { icon: CalendarCheck, colorClass: 'text-type-service' },
  repair: { icon: Wrench, colorClass: 'text-type-repair' },
  replacement: { icon: RefreshCw, colorClass: 'text-type-replace' },
  purchase: { icon: ShoppingCart, colorClass: 'text-type-purchase' },
  other: { icon: Ellipsis, colorClass: 'text-type-other' },
}
