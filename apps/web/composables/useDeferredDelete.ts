import { getCurrentInstance, onBeforeUnmount } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import { TOAST_WITH_ACTION_DURATION_MS, useToast } from './useToast'

/** Сколько ждём «Отменить», прежде чем отправить DELETE (как долго живёт toast с действием) */
export const DEFERRED_DELETE_DELAY_MS = TOAST_WITH_ACTION_DURATION_MS

const UNDO_LABEL = 'Отменить'
const DELETE_FAILED_MESSAGE = 'Не удалось удалить'

export interface DeferredDeleteRunContext {
  /** `true`, когда страницу закрывают: запрос обязан уйти с `fetch(…, { keepalive: true })` */
  keepalive: boolean
}

export interface ScheduleDeleteOptions {
  /** Идентификатор удаления (`entry:12`): повторный вызов с тем же ключом, пока таймер идёт, игнорируется */
  key: string
  /** Текст toast, например «Запись удалена»; «Отменить» добавляется кнопкой */
  message: string
  /** Сам DELETE. Для `keepalive` пробросить флаг в `$fetch(url, { method: 'DELETE', keepalive })` */
  run: (context: DeferredDeleteRunContext) => Promise<void>
  /** Вернуть элемент в UI: «Отменить» или ошибка запроса */
  onUndo: () => void
}

interface PendingDelete {
  options: ScheduleDeleteOptions
  timer: ReturnType<typeof setTimeout>
  toastId: number
  /** Компонент, из которого запланировано удаление (при его размонтировании удаление выполняется) */
  owner: object | null
}

// Модульное состояние: toast и таймеры должны пережить уход со страницы (SPA, без SSR)
const pending = new Map<string, PendingDelete>()
let listening = false

function takePending(key: string): PendingDelete | undefined {
  const item = pending.get(key)
  if (!item) return undefined
  clearTimeout(item.timer)
  pending.delete(key)
  return item
}

async function execute(item: PendingDelete, keepalive: boolean) {
  try {
    await item.options.run({ keepalive })
  } catch {
    // При закрытии страницы восстанавливать UI уже некому
    if (keepalive) return
    item.options.onUndo()
    useToast().show({ message: DELETE_FAILED_MESSAGE, icon: CircleAlert })
  }
}

function runNow(key: string, keepalive: boolean) {
  const item = takePending(key)
  if (!item) return Promise.resolve()
  useToast().dismiss(item.toastId)
  return execute(item, keepalive)
}

function undo(key: string) {
  const item = takePending(key)
  if (item) item.options.onUndo()
}

/** Выполнить все незавершённые удаления сейчас (закрытие вкладки, `pagehide`) */
export function flushPendingDeletes(): void {
  for (const key of [...pending.keys()]) void runNow(key, true)
}

function flushOwnedBy(owner: object) {
  for (const [key, item] of [...pending]) {
    if (item.owner === owner) void runNow(key, false)
  }
}

function listenForPageExit() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('pagehide', flushPendingDeletes)
  window.addEventListener('beforeunload', flushPendingDeletes)
}

/**
 * Отложенное удаление без диалога («Запись удалена · Отменить»).
 *
 * Вызывающий сам убирает элемент из UI до `scheduleDelete`; через 5 с вызывается `run`,
 * «Отменить» — `onUndo` без запроса. Незавершённые удаления выполняются при `pagehide` /
 * `beforeunload` (с `keepalive`) и при размонтировании компонента, который их запланировал.
 */
export function useDeferredDelete() {
  const owner = getCurrentInstance()
  if (owner) onBeforeUnmount(() => flushOwnedBy(owner))

  function scheduleDelete(options: ScheduleDeleteOptions): void {
    const { key, message } = options
    if (pending.has(key)) return
    listenForPageExit()

    const toastId = useToast().show({
      message,
      action: { label: UNDO_LABEL, onClick: () => undo(key) },
    })
    const timer = setTimeout(() => void runNow(key, false), DEFERRED_DELETE_DELAY_MS)
    pending.set(key, { options, timer, toastId, owner })
  }

  return { scheduleDelete }
}
