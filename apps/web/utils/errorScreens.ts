import type { Component } from 'vue'
import { Clock, Map as MapIcon, ShieldX, TriangleAlert } from 'lucide-vue-next'

/** Вид экрана ошибки: И4 (404), И5 (500), И6 (403), И7 (сессия истекла). */
export type ErrorKind = 'not-found' | 'server' | 'forbidden' | 'session-expired'

export interface ErrorScreenContent {
  icon: Component
  title: string
  message: string
}

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404

export const errorScreens: Record<ErrorKind, ErrorScreenContent> = {
  'not-found': {
    icon: MapIcon,
    title: 'Страница не найдена',
    message: 'Такой страницы нет или её удалили. Проверьте адрес или вернитесь к своим машинам.',
  },
  server: {
    icon: TriangleAlert,
    title: 'Что-то пошло не так',
    message:
      'Не получилось загрузить данные. Попробуйте ещё раз — если не помогает, зайдите позже.',
  },
  forbidden: {
    icon: ShieldX,
    title: 'Нет доступа',
    message:
      'Эта машина вам недоступна: она принадлежит другому человеку или владелец убрал вас из участников.',
  },
  'session-expired': {
    icon: Clock,
    title: 'Сессия истекла',
    message: 'Войдите снова — мы вернём вас на этот экран.',
  },
}

/** Любой статус, кроме 401/403/404, — общая ошибка (И5), в т. ч. сетевой сбой без статуса. */
export function resolveErrorKind(statusCode?: number): ErrorKind {
  if (statusCode === HTTP_UNAUTHORIZED) return 'session-expired'
  if (statusCode === HTTP_FORBIDDEN) return 'forbidden'
  if (statusCode === HTTP_NOT_FOUND) return 'not-found'
  return 'server'
}
