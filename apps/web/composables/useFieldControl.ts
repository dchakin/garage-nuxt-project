import { computed, useAttrs, useId } from 'vue'

interface FieldControlProps {
  id?: string
  hint?: string
  error?: string
}

/**
 * Общее для полей UI-кита (UiField, UiTextarea, UiAmountField): id для связки подписи
 * с полем, id подсказки/ошибки для aria-describedby и разделение атрибутов — class/style
 * идут на обёртку, остальные (name, autocomplete, maxlength…) — на сам input.
 * Компонент должен объявить `defineOptions({ inheritAttrs: false })`.
 */
export function useFieldControl(props: FieldControlProps) {
  const attrs = useAttrs()
  const generatedId = useId()
  const inputId = computed(() => props.id ?? `field-${generatedId}`)
  const helperId = computed(() => `${inputId.value}-helper`)

  const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
  const inputAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs
    return rest
  })

  const invalid = computed(() => Boolean(props.error))
  const describedBy = computed(() => (props.error || props.hint ? helperId.value : undefined))

  return { inputId, helperId, rootAttrs, inputAttrs, invalid, describedBy }
}
