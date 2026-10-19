import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

/** Свежий модуль на каждый тест: состояние (toast, таймеры, слушатели) модульное. */
async function loadModules() {
  vi.resetModules()
  const deferred = await import('~/composables/useDeferredDelete')
  const toast = await import('~/composables/useToast')
  return { ...deferred, useToast: toast.useToast }
}

const DELAY = 5000

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function setup(runImpl: () => Promise<void> = () => Promise.resolve()) {
  const run = vi.fn(runImpl)
  const onUndo = vi.fn()
  return { run, onUndo, options: { key: 'entry:1', message: 'Запись удалена', run, onUndo } }
}

describe('useDeferredDelete', () => {
  it('показывает toast с «Отменить» на 5 с и не зовёт run сразу', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { run, options } = setup()

    useDeferredDelete().scheduleDelete(options)

    const toast = useToast().current.value
    expect(toast?.message).toBe('Запись удалена')
    expect(toast?.action?.label).toBe('Отменить')
    expect(toast?.duration).toBe(DELAY)
    expect(run).not.toHaveBeenCalled()
  })

  it('«Отменить» возвращает элемент и не вызывает run', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { run, onUndo, options } = setup()
    useDeferredDelete().scheduleDelete(options)

    useToast().runAction()
    await vi.advanceTimersByTimeAsync(DELAY * 2)

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(run).not.toHaveBeenCalled()
  })

  it('по таймеру вызывает run ровно один раз', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { run, onUndo, options } = setup()
    useDeferredDelete().scheduleDelete(options)

    await vi.advanceTimersByTimeAsync(DELAY - 1)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(DELAY * 2)

    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith({ keepalive: false })
    expect(onUndo).not.toHaveBeenCalled()
    expect(useToast().current.value).toBeNull()
  })

  it('повторный вызов с тем же ключом игнорируется', async () => {
    const { useDeferredDelete } = await loadModules()
    const { run, options } = setup()
    const { scheduleDelete } = useDeferredDelete()
    scheduleDelete(options)
    scheduleDelete(options)

    await vi.advanceTimersByTimeAsync(DELAY)

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('pagehide выполняет незавершённое удаление с keepalive и не дублирует его по таймеру', async () => {
    const { useDeferredDelete } = await loadModules()
    const { run, options } = setup()
    useDeferredDelete().scheduleDelete(options)

    window.dispatchEvent(new Event('pagehide'))
    window.dispatchEvent(new Event('beforeunload'))
    await vi.advanceTimersByTimeAsync(DELAY * 2)

    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith({ keepalive: true })
  })

  it('beforeunload тоже выполняет удаление', async () => {
    const { useDeferredDelete } = await loadModules()
    const { run, options } = setup()
    useDeferredDelete().scheduleDelete(options)

    window.dispatchEvent(new Event('beforeunload'))

    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith({ keepalive: true })
  })

  it('после «Отменить» pagehide ничего не удаляет', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { run, options } = setup()
    useDeferredDelete().scheduleDelete(options)
    useToast().runAction()

    window.dispatchEvent(new Event('pagehide'))

    expect(run).not.toHaveBeenCalled()
  })

  it('уход со страницы (размонтирование) выполняет удаление и убирает toast', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { run, options } = setup()
    const Page = defineComponent({
      setup() {
        useDeferredDelete().scheduleDelete(options)
        return () => h('div')
      },
    })

    const wrapper = mount(Page)
    expect(run).not.toHaveBeenCalled()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(DELAY * 2)

    expect(run).toHaveBeenCalledTimes(1)
    expect(useToast().current.value).toBeNull()
  })

  it('ошибка запроса возвращает элемент и показывает toast об ошибке', async () => {
    const { useDeferredDelete, useToast } = await loadModules()
    const { onUndo, options } = setup(() => Promise.reject(new Error('500')))
    useDeferredDelete().scheduleDelete(options)

    await vi.advanceTimersByTimeAsync(DELAY)

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(useToast().current.value?.message).toBe('Не удалось удалить')
  })
})
