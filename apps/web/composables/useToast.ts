import { shallowRef, type Component } from 'vue'

/** Сколько живёт toast («09 · Анимации», «Toast»): без действия — 3 с, с «Отменить» — 5 с */
export const TOAST_DURATION_MS = 3000
export const TOAST_WITH_ACTION_DURATION_MS = 5000

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  message: string
  /** Иконка слева; по умолчанию `CircleCheck` (успех). `null` — без иконки */
  icon?: Component | null
  action?: ToastAction
  /** Мс до скрытия; по умолчанию 3000, с `action` — 5000 */
  duration?: number
}

export interface ToastState extends ToastOptions {
  /** Ключ для <Transition>: новый toast вытесняет старый */
  id: number
  duration: number
}

// Один toast на приложение: клиент — SPA (без SSR), поэтому модульное состояние безопасно
// и не требует Nuxt — компонент и composable тестируются без него
const current = shallowRef<ToastState | null>(null)
/** Таймер на паузе (палец на toast, фокус на кнопке) — индикатор отсчёта останавливается вместе с ним */
const paused = shallowRef(false)
let nextId = 1
let timer: ReturnType<typeof setTimeout> | undefined
let deadline = 0
let remaining = 0

function clearTimer() {
  clearTimeout(timer)
  timer = undefined
}

function startTimer(ms: number) {
  clearTimer()
  paused.value = false
  remaining = ms
  deadline = Date.now() + ms
  timer = setTimeout(dismiss, ms)
}

function show(options: ToastOptions): number {
  const duration =
    options.duration ?? (options.action ? TOAST_WITH_ACTION_DURATION_MS : TOAST_DURATION_MS)
  const toast: ToastState = { ...options, id: nextId++, duration }
  current.value = toast
  startTimer(duration)
  return toast.id
}

/** Скрыть текущий toast (или только указанный — если его ещё не вытеснил новый) */
function dismiss(id?: number) {
  if (id !== undefined && current.value?.id !== id) return
  clearTimer()
  paused.value = false
  current.value = null
}

/** Пауза, пока палец на toast: оставшееся время сохраняется */
function pause() {
  if (!timer) return
  remaining = Math.max(0, deadline - Date.now())
  clearTimer()
  paused.value = true
}

function resume() {
  if (timer || !current.value) return
  startTimer(remaining)
}

function runAction() {
  const action = current.value?.action
  dismiss()
  action?.onClick()
}

/**
 * Всплывашка после действия: «Запись добавлена», «Запись удалена · Отменить».
 * Показ — `show()` из любого места; выводит его единственный `<UiToast />` в `app.vue`.
 */
export function useToast() {
  return { current, paused, show, dismiss, pause, resume, runAction }
}
