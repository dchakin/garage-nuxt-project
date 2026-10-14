import { onBeforeUnmount, ref, type Ref } from 'vue'

/** Отпустили ниже этой доли высоты шторки — закрыть («09 · Анимации», «Шторка: открыть и закрыть») */
const CLOSE_SHARE = 0.25
/** Быстрый взмах вниз закрывает при любом смещении, px/мс */
const FLING_VELOCITY = 0.5

/**
 * Свайп шторки вниз: панель идёт за пальцем 1:1 (`offset` → CSS `translate`, не `transform`,
 * чтобы не мешать переходу `sheet`). Отпустили ниже 25 % высоты или быстрым движением — `onClose`,
 * иначе `offset` сбрасывается и панель возвращается на место (transition на `translate`).
 * Слушатели move/up — на `window`, без pointer capture: иначе click по кнопке «×» в шапке
 * достаётся шапке.
 */
export function useSheetSwipe(options: { panel: Ref<HTMLElement | null>; onClose: () => void }) {
  const offset = ref(0)
  const dragging = ref(false)
  let startY = 0
  let lastY = 0
  let lastTime = 0
  let velocity = 0

  function onPointerMove(event: PointerEvent) {
    const elapsed = event.timeStamp - lastTime
    if (elapsed > 0) velocity = (event.clientY - lastY) / elapsed
    lastY = event.clientY
    lastTime = event.timeStamp
    offset.value = Math.max(0, event.clientY - startY)
  }

  function stopListening() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  function onPointerUp() {
    stopListening()
    dragging.value = false
    const height = options.panel.value?.offsetHeight ?? 0
    const shouldClose = offset.value > height * CLOSE_SHARE || velocity > FLING_VELOCITY
    if (offset.value > 0 && shouldClose) options.onClose()
    else offset.value = 0
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return
    startY = lastY = event.clientY
    lastTime = event.timeStamp
    velocity = 0
    offset.value = 0
    dragging.value = true
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  /** Перед новым открытием панель должна стоять на месте */
  function reset() {
    offset.value = 0
  }

  onBeforeUnmount(stopListening)

  return { offset, dragging, onPointerDown, reset }
}
