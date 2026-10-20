import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryList from '~/components/category/CategoryList.vue'
import NameSheet from '~/components/category/NameSheet.vue'
import UiCard from '~/components/ui/Card.vue'
import UiIconButton from '~/components/ui/IconButton.vue'
import UiField from '~/components/ui/Field.vue'
import UiButton from '~/components/ui/Button.vue'
import type { CarCategory } from '~/composables/useCategories'

const categories: CarCategory[] = [
  { id: 1, carId: 7, name: 'Кузов', isDefault: false, entriesCount: 1 },
  { id: 2, carId: 7, name: 'Аксессуары', isDefault: false, entriesCount: 0 },
]
const components = { UiCard, UiIconButton }

function mountList(editable: boolean) {
  return mount(CategoryList, {
    props: { title: 'Свои', testId: 'own', categories, editable },
    global: { components },
  })
}

describe('CategoryList', () => {
  it('показывает название и число записей', () => {
    const rows = mountList(false).findAll('[data-testid="category-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Кузов')
    expect(rows[0].text()).toContain('1 запись')
    expect(rows[1].text()).toContain('Нет записей')
  })

  it('у стандартных (не editable) нет кнопок действий', () => {
    expect(mountList(false).findAll('button')).toHaveLength(0)
  })

  it('у своих есть переименование и удаление, они эмитят категорию', async () => {
    const wrapper = mountList(true)
    await wrapper.get('button[aria-label="Переименовать категорию Кузов"]').trigger('click')
    await wrapper.get('button[aria-label="Удалить категорию Аксессуары"]').trigger('click')

    expect(wrapper.emitted('rename')?.[0]).toEqual([categories[0]])
    expect(wrapper.emitted('remove')?.[0]).toEqual([categories[1]])
  })
})

describe('NameSheet', () => {
  const stubs = { UiSheet: { template: '<div><slot /><slot name="footer" /></div>' } }
  const components = { UiField, UiButton }

  function mountSheet(category: { name: string } | null) {
    return mount(NameSheet, {
      props: { open: true, category },
      global: { stubs, components },
    })
  }

  it('пустое название не отправляется, ошибка у поля', async () => {
    const wrapper = mountSheet(null)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Укажите название категории')
  })

  it('отправляет обрезанное название', async () => {
    const wrapper = mountSheet(null)
    await wrapper.get('input').setValue('  Кузов  ')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual(['Кузов'])
  })

  it('показывает ошибку сервера', () => {
    const wrapper = mount(NameSheet, {
      props: { open: true, category: null, error: 'Такая категория уже есть' },
      global: { stubs, components },
    })
    expect(wrapper.text()).toContain('Такая категория уже есть')
  })
})
