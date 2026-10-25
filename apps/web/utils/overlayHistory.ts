/**
 * История браузера для модальных оверлеев (шторки, диалоги): открытие добавляет запись, жест
 * «назад» закрывает верхний оверлей, а страница под ним остаётся на месте.
 *
 * Роутер записей оверлеев не видит: слушатель `popstate` стоит в фазе capture и гасит
 * (`stopImmediatePropagation`) события, которые относятся к оверлеям, — vue-router обрабатывает
 * только настоящие переходы. Программное закрытие возвращает запись через `history.go(-n)`;
 * переход роутера дожидается этого в `settleOverlayHistory()` (глобальный guard), иначе
 * `pushState` страницы мог бы опередить возврат и «назад» увёл бы на призрачную запись.
 */

const DEPTH_KEY = 'garageOverlayDepth'
/** Если popstate после `history.go` не пришёл (например, нет записи, куда идти) — не ждём вечно */
const TRAVERSAL_TIMEOUT_MS = 1000

interface OverlayEntry {
  id: symbol
  /** Жест «назад» убрал запись: закрыть оверлей */
  onBack: () => void
  /** Оверлей закрыт программно, запись ещё не убрана (под ним открыт другой оверлей) */
  released: boolean
}

/** Оверлеи с записью в истории, нижний — первый; длина = число лишних записей над страницей */
const entries: OverlayEntry[] = []
/** Сколько `popstate` от наших `history.go` ещё не пришло */
let pendingTraversals = 0
let idleWaiters: Array<() => void> = []
let traversalTimer: ReturnType<typeof setTimeout> | undefined
/** `position` записи страницы (состояние vue-router), над которой лежат записи оверлеев */
let basePosition: unknown
let listening = false

function resolveIdle() {
  clearTimeout(traversalTimer)
  traversalTimer = undefined
  pendingTraversals = 0
  const waiters = idleWaiters
  idleWaiters = []
  waiters.forEach((resolve) => resolve())
}

function traverseBack(count: number) {
  if (count <= 0) return
  pendingTraversals += 1
  clearTimeout(traversalTimer)
  traversalTimer = setTimeout(resolveIdle, TRAVERSAL_TIMEOUT_MS)
  window.history.go(-count)
}

function readDepth(state: unknown): number {
  const depth = (state as Record<string, unknown> | null)?.[DEPTH_KEY]
  return typeof depth === 'number' ? depth : 0
}

function onPopState(event: PopStateEvent) {
  if (pendingTraversals > 0) {
    // Возврат, который запросили мы: роутеру о нём знать не нужно
    event.stopImmediatePropagation()
    pendingTraversals -= 1
    if (pendingTraversals === 0) resolveIdle()
    return
  }

  const depth = readDepth(event.state)
  if (!entries.length) {
    if (depth > 0) {
      // «Вперёд» на запись закрытого оверлея — сразу назад на страницу
      event.stopImmediatePropagation()
      traverseBack(1)
    }
    return
  }

  const closing = entries.splice(Math.min(depth, entries.length))
  for (const entry of closing.reverse()) if (!entry.released) entry.onBack()

  // Приземлились на запись оверлея или на свою страницу — роутеру делать нечего;
  // прыжок через несколько записей на другую страницу отдаём роутеру
  const statePosition = (event.state as { position?: unknown } | null)?.position
  if (depth > 0 || statePosition === basePosition) event.stopImmediatePropagation()
}

function ensureListening() {
  if (listening) return
  listening = true
  window.addEventListener('popstate', onPopState, { capture: true })
}

/** Оверлей открылся: добавить запись истории (адрес не меняется) */
export function pushOverlayEntry(id: symbol, onBack: () => void) {
  ensureListening()
  if (!entries.length) {
    basePosition = (window.history.state as { position?: unknown } | null)?.position
  }
  entries.push({ id, onBack, released: false })
  window.history.pushState({ ...window.history.state, [DEPTH_KEY]: entries.length }, '')
}

/** Оверлей закрылся не жестом «назад»: убрать его запись, когда она станет верхней */
export function releaseOverlayEntry(id: symbol) {
  const entry = entries.find((item) => item.id === id)
  if (!entry) return
  entry.released = true

  let count = 0
  while (entries.length && entries[entries.length - 1]!.released) {
    entries.pop()
    count += 1
  }
  traverseBack(count)
}

/**
 * Перед переходом роутера: убрать записи оверлеев (если оверлей остался открыт, переход его закроет)
 * и дождаться, пока история вернётся на запись страницы.
 */
export function settleOverlayHistory(): Promise<void> {
  const count = entries.length
  entries.length = 0
  traverseBack(count)
  if (pendingTraversals === 0) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

/** Только для тестов: сброс модульного состояния */
export function resetOverlayHistory() {
  entries.length = 0
  resolveIdle()
  if (listening) window.removeEventListener('popstate', onPopState, { capture: true })
  listening = false
  basePosition = undefined
}
