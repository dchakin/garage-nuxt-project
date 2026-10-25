import { onBeforeUnmount, watch, type Ref } from 'vue'
import { pushOverlayEntry, releaseOverlayEntry } from '~/utils/overlayHistory'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Открытые оверлеи, верхний — последний: Esc и Tab обрабатывает только он (диалог поверх шторки) */
const overlayStack: symbol[] = []

function focusableIn(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

/** Tab и Shift+Tab не выходят за пределы панели */
function trapTab(event: KeyboardEvent, panel: HTMLElement) {
  const items = focusableIn(panel)
  if (!items.length) {
    event.preventDefault()
    panel.focus()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * Общее поведение модальных оверлеев (`UiSheet`, `UiDialog`): Esc, удержание фокуса внутри,
 * блокировка прокрутки страницы, возврат фокуса на элемент, открывший оверлей, запись в истории
 * браузера (жест «назад» закрывает оверлей через `onEscape`, см. `utils/overlayHistory.ts`).
 * `focusInitial` вызывается после анимации появления (`@after-enter`), иначе на мобильных
 * клавиатура выезжает посреди анимации и дёргает шторку.
 */
export function useModalOverlay(options: {
  open: Ref<boolean>
  panel: Ref<HTMLElement | null>
  onEscape: () => void
  /** Селектор элемента, получающего фокус при открытии; по умолчанию — `[autofocus]`, затем панель */
  initialFocus?: string
}) {
  const id = Symbol('overlay')
  let returnFocusTo: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent) {
    if (overlayStack[overlayStack.length - 1] !== id) return
    const panel = options.panel.value
    if (event.key === 'Escape') {
      event.preventDefault()
      options.onEscape()
    } else if (event.key === 'Tab' && panel) {
      trapTab(event, panel)
    }
  }

  function activate() {
    returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    overlayStack.push(id)
    if (overlayStack.length === 1) document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    pushOverlayEntry(id, options.onEscape)
  }

  function deactivate() {
    const index = overlayStack.indexOf(id)
    if (index === -1) return
    overlayStack.splice(index, 1)
    if (!overlayStack.length) document.body.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
    releaseOverlayEntry(id)
    returnFocusTo?.focus()
    returnFocusTo = null
  }

  function focusInitial() {
    const panel = options.panel.value
    if (!panel || panel.contains(document.activeElement)) return
    const selector = options.initialFocus ?? '[autofocus]'
    const target = panel.querySelector<HTMLElement>(selector) ?? panel
    target.focus()
  }

  watch(options.open, (isOpen) => (isOpen ? activate() : deactivate()), { immediate: true })
  onBeforeUnmount(deactivate)

  return { focusInitial }
}
