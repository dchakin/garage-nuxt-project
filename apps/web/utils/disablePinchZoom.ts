/**
 * iOS Safari игнорирует `user-scalable=no` в viewport и масштабирует страницу жестом двумя пальцами —
 * его можно остановить только отменой нестандартного события `gesturestart`.
 * Возвращает функцию, снимающую обработчик.
 */
export function disablePinchZoom(target: Document = document): () => void {
  const preventGesture = (event: Event) => event.preventDefault()
  target.addEventListener('gesturestart', preventGesture)
  return () => target.removeEventListener('gesturestart', preventGesture)
}
