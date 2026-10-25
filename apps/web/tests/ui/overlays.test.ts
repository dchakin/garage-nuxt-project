import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type Component } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import UiSheet from '~/components/ui/Sheet.vue'
import UiDialog from '~/components/ui/Dialog.vue'
import { resetOverlayHistory } from '~/utils/overlayHistory'

// Пропсы оверлеев задаются динамически — типизация пропсов в обёртке не нужна
type OverlayWrapper = VueWrapper<any>

const mounted: OverlayWrapper[] = []

/** Оверлей с v-model:open, как у родителя: `update:open` сразу меняет проп */
function mountOverlay(component: Component, props: Record<string, unknown>, slots = {}) {
  const wrapper: OverlayWrapper = mount(component, {
    props: {
      open: true,
      'onUpdate:open': (open: boolean) => wrapper.setProps({ open }),
      ...props,
    },
    slots,
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const buttonByName = (name: string) =>
  Array.from(document.querySelectorAll('button')).find(
    (button) => button.getAttribute('aria-label') === name || button.textContent?.trim() === name,
  )!
const pressEscape = () =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

function createOpener() {
  const opener = document.createElement('button')
  opener.textContent = 'Открыть'
  document.body.append(opener)
  opener.focus()
  return opener
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  resetOverlayHistory()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('UiSheet', () => {
  it('закрыта — ничего не рендерит; открыта — диалог с заголовком и блокировкой прокрутки', async () => {
    const wrapper = mountOverlay(UiSheet, { open: false, title: 'Новая запись' })
    expect(byTestId('sheet')).toBeNull()

    await wrapper.setProps({ open: true })
    const sheet = byTestId('sheet')!
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(document.getElementById(sheet.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Новая запись',
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('закрывается по «×», тапу по затемнению и Esc и возвращает фокус открывшему', async () => {
    const opener = createOpener()
    const wrapper = mountOverlay(UiSheet, { open: false, title: 'Пробег' })

    for (const close of [
      () => buttonByName('Закрыть').click(),
      () => document.querySelector<HTMLElement>('.overlay-scrim')!.click(),
      pressEscape,
    ]) {
      await wrapper.setProps({ open: true })
      byTestId('sheet')!.focus()
      close()
      await wrapper.vm.$nextTick()
      expect(wrapper.props('open')).toBe(false)
      expect(byTestId('sheet')).toBeNull()
      expect(document.activeElement).toBe(opener)
      expect(document.body.style.overflow).toBe('')
    }
  })

  it('свайп вниз: короткий возвращает на место, ниже 25 % высоты — закрывает', async () => {
    const wrapper = mountOverlay(UiSheet, { title: 'Пробег' })
    const sheet = byTestId('sheet')!
    Object.defineProperty(sheet, 'offsetHeight', { value: 400 })
    const header = sheet.querySelector('header')!

    async function swipeTo(clientY: number) {
      header.dispatchEvent(
        new PointerEvent('pointerdown', { clientY: 0, button: 0, bubbles: true }),
      )
      window.dispatchEvent(new PointerEvent('pointermove', { clientY }))
      await tick()
      // Палец остановился: скорость в момент отпускания ≈ 0, решает только смещение
      window.dispatchEvent(new PointerEvent('pointermove', { clientY }))
      await wrapper.vm.$nextTick()
      expect(sheet.style.translate).toBe(`0 ${clientY}px`)
      window.dispatchEvent(new PointerEvent('pointerup', { clientY }))
      await wrapper.vm.$nextTick()
    }

    await swipeTo(60)
    expect(wrapper.props('open')).toBe(true)
    expect(sheet.style.translate).toBe('')

    await swipeTo(150)
    expect(wrapper.props('open')).toBe(false)
  })

  it('показывает тело и кнопку действия из слотов', () => {
    mountOverlay(
      UiSheet,
      { title: 'Новая запись' },
      { default: () => h('p', 'Поля формы'), footer: () => h('button', 'Сохранить') },
    )
    expect(byTestId('sheet')!.querySelector('footer')!.textContent).toBe('Сохранить')
    expect(byTestId('sheet')!.textContent).toContain('Поля формы')
  })
})

describe('UiDialog', () => {
  const props = {
    title: 'Удалить Toyota Camry?',
    message: 'Это нельзя отменить.',
    confirmText: 'Удалить',
  }

  it('тап по затемнению не закрывает; «Отмена» закрывает и эмитит cancel', async () => {
    const wrapper = mountOverlay(UiDialog, props)
    const dialog = byTestId('dialog')!
    expect(dialog.getAttribute('role')).toBe('alertdialog')
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Это нельзя отменить.',
    )

    document.querySelector<HTMLElement>('.overlay-scrim')!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.props('open')).toBe(true)

    buttonByName('Отмена').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.props('open')).toBe(false)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('подтверждение эмитит confirm и оставляет диалог открытым до конца запроса', async () => {
    const wrapper = mountOverlay(UiDialog, props)
    buttonByName('Удалить').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.props('open')).toBe(true)
  })

  it('во время запроса кнопки неактивны и Esc не закрывает', async () => {
    const wrapper = mountOverlay(UiDialog, { ...props, loading: true })
    expect(buttonByName('Отмена').disabled).toBe(true)
    pressEscape()
    await wrapper.vm.$nextTick()
    expect(wrapper.props('open')).toBe(true)
  })

  it('после появления фокус на «Отмене»', async () => {
    mount(UiDialog, {
      props: { ...props, open: true },
      attachTo: document.body,
      global: { stubs: { transition: false } },
    })
    await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Отмена')
  })

  it('поверх шторки Esc закрывает только диалог', async () => {
    const Host = defineComponent({
      setup() {
        const sheetOpen = ref(true)
        const dialogOpen = ref(true)
        return () => [
          h(UiSheet, {
            title: 'Машина',
            open: sheetOpen.value,
            'onUpdate:open': (open: boolean) => (sheetOpen.value = open),
          }),
          h(UiDialog, {
            ...props,
            open: dialogOpen.value,
            'onUpdate:open': (open: boolean) => (dialogOpen.value = open),
          }),
        ]
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    mounted.push(wrapper)

    pressEscape()
    await wrapper.vm.$nextTick()
    expect(byTestId('dialog')).toBeNull()
    expect(byTestId('sheet')).not.toBeNull()

    pressEscape()
    await wrapper.vm.$nextTick()
    expect(byTestId('sheet')).toBeNull()
  })
})

describe('жест «назад»', () => {
  const props = { title: 'Удалить?', message: 'Нельзя отменить.', confirmText: 'Удалить' }

  it.each([
    ['UiSheet', UiSheet, { title: 'Пробег' }],
    ['UiDialog', UiDialog, props],
  ])('%s: открытие добавляет запись истории, popstate закрывает', async (_name, component, p) => {
    const pushState = vi.spyOn(window.history, 'pushState')
    const wrapper = mountOverlay(component, p)
    expect(pushState).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await wrapper.vm.$nextTick()

    expect(wrapper.props('open')).toBe(false)
    pushState.mockRestore()
  })
})
