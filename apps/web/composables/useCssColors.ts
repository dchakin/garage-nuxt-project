import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

function readCssVars<T extends string>(names: readonly T[]): Record<T, string> {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
  ) as Record<T, string>
}

/**
 * Значения токенов из tokens.css для того, что рисуется не CSS-классами (canvas chart.js).
 * Перечитываются при смене темы: следим за `class` на <html>, который переключает useTheme
 * и inline-скрипт темы. `names` — имена токенов без `--` (`'chart-bar'`, `'text-2'`).
 */
export function useCssColors<T extends string>(names: readonly T[]): Ref<Record<T, string>> {
  const colors = ref(readCssVars(names)) as Ref<Record<T, string>>
  let observer: MutationObserver | undefined

  onMounted(() => {
    observer = new MutationObserver(() => {
      colors.value = readCssVars(names)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })
  onBeforeUnmount(() => observer?.disconnect())

  return colors
}
