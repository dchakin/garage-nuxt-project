import type { Component } from 'vue'
import type { ReminderStatus } from '@garage/shared/types'
import { CircleAlert, CircleCheck, CirclePause, Clock } from 'lucide-vue-next'

interface ReminderStatusStyle {
  icon: Component
  /** Иконка и текст статуса (слово в бейдже, остаток в карточке) */
  textClass: string
  /** Фон бейджа */
  softClass: string
  /** Заливка полосы прогресса */
  barClass: string
  /** Полоса слева у карточки напоминания */
  stripeClass: string
}

/** Иконка и цвета статуса напоминания (design/garage.pen, «06 · Компоненты: данные»). */
export const reminderStatusStyles: Record<ReminderStatus, ReminderStatusStyle> = {
  overdue: {
    icon: CircleAlert,
    textClass: 'text-status-overdue-text',
    softClass: 'bg-status-overdue-soft',
    barClass: 'bg-status-overdue',
    stripeClass: 'border-l-status-overdue',
  },
  soon: {
    icon: Clock,
    textClass: 'text-status-soon-text',
    softClass: 'bg-status-soon-soft',
    barClass: 'bg-status-soon',
    stripeClass: 'border-l-status-soon',
  },
  ok: {
    icon: CircleCheck,
    textClass: 'text-status-ok-text',
    softClass: 'bg-status-ok-soft',
    barClass: 'bg-status-ok',
    stripeClass: 'border-l-status-ok',
  },
  inactive: {
    icon: CirclePause,
    textClass: 'text-status-inactive-text',
    softClass: 'bg-status-inactive-soft',
    barClass: 'bg-status-inactive',
    stripeClass: 'border-l-status-inactive',
  },
}
