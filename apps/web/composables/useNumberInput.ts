import { ref, watch, type Ref } from 'vue'
import {
  formatNumberInput,
  numberToInputText,
  removeDigitAcrossGroupSpace,
} from '~/utils/numberInput'

/**
 * Числовое поле с разрядами и при вводе (`680 000`), см. utils/numberInput.ts.
 * Используют UiField (type="number", целые) и UiAmountField (копейки, decimals = 2).
 */
export function useNumberInput(model: Ref<number | null | undefined>, decimals = 0) {
  // Текст поля держим отдельно от модели: `1 250,` ещё не число, но запятую терять нельзя
  const text = ref(numberToInputText(model.value, decimals))

  watch(model, (value) => {
    const current = formatNumberInput(text.value, 0, decimals).value
    if (value !== current) text.value = numberToInputText(value, decimals)
  })

  function onNumberInput(event: Event) {
    const input = event.target as HTMLInputElement
    const { raw, caret } = removeDigitAcrossGroupSpace(
      input.value,
      text.value,
      input.selectionStart ?? input.value.length,
      (event as InputEvent).inputType ?? '',
    )
    const state = formatNumberInput(raw, caret, decimals)
    text.value = state.text
    // Пишем в DOM сразу: если текст не изменился (набрали букву), Vue не перерисует поле
    input.value = state.text
    input.setSelectionRange(state.caret, state.caret)
    model.value = state.value
  }

  return { text, onNumberInput }
}
