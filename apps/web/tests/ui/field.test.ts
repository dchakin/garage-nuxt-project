import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiField from '~/components/ui/Field.vue'
import UiTextarea from '~/components/ui/Textarea.vue'
import UiAmountField from '~/components/ui/AmountField.vue'
import UiSearchField from '~/components/ui/SearchField.vue'

describe('UiField', () => {
  it('подпись связана с полем, подсказка — через aria-describedby', () => {
    const wrapper = mount(UiField, { props: { label: 'Место', hint: 'Из прошлых записей' } })
    const input = wrapper.find('input')
    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'))
    const helper = wrapper.find(`#${input.attributes('aria-describedby')}`)
    expect(helper.text()).toBe('Из прошлых записей')
    expect(input.attributes('aria-invalid')).toBeUndefined()
  })

  it('ошибка показывается вместо подсказки и ставит aria-invalid', () => {
    const wrapper = mount(UiField, {
      props: { label: 'Пробег', hint: 'Подсказка', error: 'Меньше текущего' },
    })
    const input = wrapper.find('input')
    expect(wrapper.text()).toContain('Меньше текущего')
    expect(wrapper.text()).not.toContain('Подсказка')
    expect(input.attributes('aria-invalid')).toBe('true')
    const helper = wrapper.find(`#${input.attributes('aria-describedby')}`)
    expect(helper.text()).toBe('Меньше текущего')
    expect(wrapper.find('svg.lucide-circle-alert').exists()).toBe(true)
  })

  it('v-model: строка', async () => {
    const wrapper = mount(UiField, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('dmitry@mail.ru')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['dmitry@mail.ru'])
  })

  it('type="number" отдаёт число или null и открывает цифровую клавиатуру', async () => {
    const wrapper = mount(UiField, { props: { type: 'number', modelValue: null, suffix: 'км' } })
    const input = wrapper.find('input')
    expect(input.attributes('inputmode')).toBe('numeric')
    expect(wrapper.text()).toContain('км')
    await input.setValue('87 450')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([87450])
    await input.setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('число с разрядами — и до ввода, и при вводе', async () => {
    const wrapper = mount(UiField, { props: { type: 'number', modelValue: 87450 } })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('87 450')
    await input.setValue('874500')
    expect(input.element.value).toBe('874 500')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([874500])
  })

  it('пароль: кнопка показывает и скрывает значение', async () => {
    const wrapper = mount(UiField, { props: { type: 'password', modelValue: 'secret' } })
    expect(wrapper.find('input').attributes('type')).toBe('password')
    await wrapper.find('button[aria-label="Показать пароль"]').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('options превращают поле в список', async () => {
    const wrapper = mount(UiField, {
      props: {
        modelValue: 'oil',
        options: [
          { value: 'oil', label: 'Масло и фильтры' },
          { value: 'tires', label: 'Шины' },
        ],
      },
    })
    await wrapper.find('select').setValue('tires')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['tires'])
  })

  it('class уходит на обёртку, остальные атрибуты — на input', () => {
    const wrapper = mount(UiField, { attrs: { class: 'w-full', name: 'mileage' } })
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.find('input').attributes('name')).toBe('mileage')
  })
})

describe('UiTextarea', () => {
  it('показывает счётчик символов', async () => {
    const wrapper = mount(UiTextarea, {
      props: { label: 'Заметка', maxlength: 500, modelValue: '' },
    })
    expect(wrapper.text()).toContain('0 / 500')
    await wrapper.setProps({ modelValue: 'Mobil' })
    expect(wrapper.text()).toContain('5 / 500')
  })

  it('ошибка ставит aria-invalid', () => {
    const wrapper = mount(UiTextarea, { props: { error: 'Слишком длинно' } })
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true')
  })
})

describe('UiAmountField', () => {
  it('без фокуса показывает сумму с разрядами', () => {
    const wrapper = mount(UiAmountField, { props: { modelValue: 6800 } })
    expect(wrapper.find('input').element.value).toBe('6 800')
    expect(wrapper.find('input').attributes('inputmode')).toBe('decimal')
  })

  it('при вводе расставляет разряды и держит курсор у той же цифры', async () => {
    const wrapper = mount(UiAmountField, { props: { modelValue: 68000 }, attachTo: document.body })
    const input = wrapper.find('input')
    const element = input.element
    expect(element.value).toBe('68 000')
    // Дописали 0 в конец
    element.value = '68 0000'
    element.setSelectionRange(element.value.length, element.value.length)
    await input.trigger('input')
    expect(element.value).toBe('680 000')
    expect(element.selectionStart).toBe(element.value.length)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([680000])
    wrapper.unmount()
  })

  it('разбирает ввод с запятой', async () => {
    const wrapper = mount(UiAmountField, { props: { modelValue: null } })
    const input = wrapper.find('input')
    await input.setValue('1250,5')
    expect(input.element.value).toBe('1 250,5')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1250.5])
    await input.setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })
})

describe('UiSearchField', () => {
  it('крестик очищает запрос', async () => {
    const wrapper = mount(UiSearchField, { props: { modelValue: 'масло' } })
    await wrapper.find('button[aria-label="Очистить поиск"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })

  it('без запроса крестика нет', () => {
    const wrapper = mount(UiSearchField, { props: { modelValue: '' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
