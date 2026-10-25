import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Car } from '@garage/shared/types'
import UiAlert from '~/components/ui/Alert.vue'
import UiField from '~/components/ui/Field.vue'
import CarSettingsForm from '~/components/car/CarSettingsForm.vue'

// Компонент полагается на авто-импорты Nuxt — в тесте подставляем их вручную
Object.assign(globalThis, { ref, computed })

const car = {
  id: 1,
  brand: 'Lada',
  model: 'Largus',
  year: 2020,
  plateNumber: null,
  vin: null,
} as unknown as Car

describe('CarSettingsForm: госномер', () => {
  it('ввод строчных букв превращает номер в заглавные и отправляет их', async () => {
    const wrapper = mount(CarSettingsForm, {
      props: { car, formId: 'car-settings-form' },
      global: { components: { UiAlert, UiField } },
    })
    const plate = wrapper.findAll('input').find((input) => input.element.value === '')
    // Пустые поля — госномер и VIN; госномер идёт первым
    expect(plate).toBeDefined()
    plate!.element.value = 'у911рв'
    plate!.element.setSelectionRange(3, 3)
    await plate!.trigger('input')

    expect(plate!.element.value).toBe('У911РВ')
    expect(plate!.element.selectionStart).toBe(3)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ plateNumber: 'У911РВ' })
  })
})
