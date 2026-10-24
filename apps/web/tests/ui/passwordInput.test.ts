import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from '~/components/PasswordInput.vue'
import UiField from '~/components/ui/Field.vue'

function mountPasswordInput(props: Record<string, unknown> = {}) {
  return mount(PasswordInput, {
    props: { modelValue: '', ...props },
    global: { components: { UiField } },
  })
}

describe('PasswordInput', () => {
  it('поле пароля с подписью «Пароль», по умолчанию обязательное', () => {
    const wrapper = mountPasswordInput()
    const input = wrapper.find('input')
    expect(wrapper.find('label').text()).toBe('Пароль')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('required')).toBeDefined()
  })

  it('кнопка показывает и скрывает пароль', async () => {
    const wrapper = mountPasswordInput()
    const toggle = wrapper.find('button')
    expect(toggle.attributes('aria-label')).toBe('Показать пароль')

    await toggle.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Скрыть пароль')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('эмитит update:modelValue при вводе и пробрасывает атрибуты на input', async () => {
    const wrapper = mountPasswordInput({ autocomplete: 'new-password', minlength: 6 })
    const input = wrapper.find('input')
    expect(input.attributes('autocomplete')).toBe('new-password')
    expect(input.attributes('minlength')).toBe('6')

    await input.setValue('secret-1')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['secret-1'])
  })

  it('показывает подсказку', () => {
    const wrapper = mountPasswordInput({ hint: 'Минимум 6 символов' })
    expect(wrapper.text()).toContain('Минимум 6 символов')
  })
})
