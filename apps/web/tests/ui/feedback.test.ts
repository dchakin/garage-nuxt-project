import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { WifiOff } from 'lucide-vue-next'
import UiToast from '~/components/ui/Toast.vue'
import UiAlert from '~/components/ui/Alert.vue'
import UiEmptyState from '~/components/ui/EmptyState.vue'
import UiReminderBridge from '~/components/ui/ReminderBridge.vue'
import UiDisclosure from '~/components/ui/Disclosure.vue'
import { TOAST_DURATION_MS, TOAST_WITH_ACTION_DURATION_MS, useToast } from '~/composables/useToast'

describe('UiToast + useToast', () => {
  const toast = useToast()

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    toast.dismiss()
    vi.useRealTimers()
  })

  const findToast = (wrapper: ReturnType<typeof mount>) => wrapper.find('[data-testid="toast"]')

  it('без вызова show ничего не показывает, но live-регион есть заранее', () => {
    const wrapper = mount(UiToast)
    expect(findToast(wrapper).exists()).toBe(false)
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })

  it('кнопка действия вызывает onClick и закрывает toast', async () => {
    const wrapper = mount(UiToast)
    const onClick = vi.fn()
    toast.show({ message: 'Запись удалена', action: { label: 'Отменить', onClick } })
    await nextTick()

    expect(findToast(wrapper).text()).toContain('Запись удалена')
    await wrapper.get('button').trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(findToast(wrapper).exists()).toBe(false)
  })

  it('с действием исчезает через 5 с, без действия — через 3 с', async () => {
    const wrapper = mount(UiToast)
    toast.show({ message: 'Запись удалена', action: { label: 'Отменить', onClick: vi.fn() } })
    await nextTick()

    vi.advanceTimersByTime(TOAST_WITH_ACTION_DURATION_MS - 1)
    await nextTick()
    expect(findToast(wrapper).exists()).toBe(true)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(findToast(wrapper).exists()).toBe(false)

    toast.show({ message: 'Запись добавлена' })
    await nextTick()
    expect(wrapper.find('button').exists()).toBe(false)
    vi.advanceTimersByTime(TOAST_DURATION_MS)
    await nextTick()
    expect(findToast(wrapper).exists()).toBe(false)
  })

  it('duration задаётся явно', () => {
    toast.show({ message: 'Пробег обновлён: 87 912 км', duration: 1000 })
    vi.advanceTimersByTime(1000)
    expect(toast.current.value).toBeNull()
  })

  it('палец на toast ставит таймер на паузу, отпускание продолжает с остатка', async () => {
    const wrapper = mount(UiToast)
    toast.show({ message: 'Запись добавлена' })
    await nextTick()

    vi.advanceTimersByTime(1000)
    await findToast(wrapper).trigger('pointerdown')
    vi.advanceTimersByTime(10_000)
    expect(toast.current.value).not.toBeNull()

    await findToast(wrapper).trigger('pointerup')
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1000 - 1)
    expect(toast.current.value).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(toast.current.value).toBeNull()
  })

  it('новый toast вытесняет старый, и таймер старого его не закрывает', async () => {
    const wrapper = mount(UiToast)
    const firstId = toast.show({ message: 'Запись удалена', duration: 1000 })
    toast.show({ message: 'Запись добавлена' })
    await nextTick()

    expect(findToast(wrapper).text()).toContain('Запись добавлена')
    toast.dismiss(firstId)
    vi.advanceTimersByTime(1000)
    expect(toast.current.value?.message).toBe('Запись добавлена')
  })
})

describe('UiAlert', () => {
  it('error объявляется сразу (role=alert), остальные — status', () => {
    const error = mount(UiAlert, { props: { variant: 'error', title: 'Не удалось сохранить' } })
    expect(error.attributes('role')).toBe('alert')
    const info = mount(UiAlert, { props: { variant: 'info', title: 'Только на экране «Домой»' } })
    expect(info.attributes('role')).toBe('status')
  })

  it('показывает заголовок, текст и кнопки из слота actions', () => {
    const wrapper = mount(UiAlert, {
      props: {
        variant: 'warning',
        title: '2 срока просрочены',
        message: 'Замена масла и техосмотр.',
      },
      slots: { actions: '<button>Открыть</button>' },
    })
    expect(wrapper.text()).toContain('2 срока просрочены')
    expect(wrapper.text()).toContain('Замена масла и техосмотр.')
    expect(wrapper.find('button').text()).toBe('Открыть')
  })

  it('иконка варианта заменяется пропом icon', () => {
    const wrapper = mount(UiAlert, {
      props: { variant: 'warning', title: 'Нет соединения', icon: WifiOff },
    })
    expect(wrapper.findComponent(WifiOff).exists()).toBe(true)
  })
})

describe('UiEmptyState', () => {
  it('заголовок, текст и действие из слота; без слота — без кнопки', () => {
    const withAction = mount(UiEmptyState, {
      props: { icon: WifiOff, title: 'Записей пока нет', message: 'Добавляйте ТО' },
      slots: { action: '<button>Добавить запись</button>' },
    })
    expect(withAction.get('h2').text()).toBe('Записей пока нет')
    expect(withAction.find('button').text()).toBe('Добавить запись')

    const withoutAction = mount(UiEmptyState, {
      props: { icon: WifiOff, title: 'Напоминаний пока нет' },
    })
    expect(withoutAction.find('button').exists()).toBe(false)
    expect(withoutAction.find('p').exists()).toBe(false)
  })
})

describe('UiReminderBridge', () => {
  it('переключатель подписан заголовком и эмитит update:modelValue', async () => {
    const wrapper = mount(UiReminderBridge, {
      props: { modelValue: true, title: 'Закрыть «Замена масла»', subtitle: 'Следующая — …' },
    })
    const toggle = wrapper.get('[role="switch"]')
    const titleId = toggle.attributes('aria-labelledby')!
    expect(wrapper.get(`#${CSS.escape(titleId)}`).text()).toBe('Закрыть «Замена масла»')
    expect(toggle.attributes('aria-checked')).toBe('true')

    await toggle.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})

describe('UiDisclosure', () => {
  it('закрытая не рендерит содержимое; клик раскрывает и ставит aria-expanded', async () => {
    const wrapper = mount(UiDisclosure, {
      props: { label: 'Категория, место, заметка' },
      slots: { default: '<input name="place" />' },
    })
    const button = wrapper.get('button')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input').exists()).toBe(false)

    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find(`#${CSS.escape(button.attributes('aria-controls')!)}`).exists()).toBe(true)
    expect(wrapper.emitted('update:open')).toEqual([[true]])
  })

  it('хуки высоты подключены к Transition: раскрывающийся блок стартует с height: 0', async () => {
    const wrapper = mount(UiDisclosure, {
      props: { label: 'Категория, место, заметка' },
      slots: { default: '<input name="place" />' },
      global: { stubs: { transition: false } },
      attachTo: document.body,
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('.collapse-body').attributes('style')).toContain('height: 0px')
    wrapper.unmount()
  })
})
