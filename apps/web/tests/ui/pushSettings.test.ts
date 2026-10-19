import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const state = {
  supported: ref(true),
  vapidMissing: ref(false),
  permission: ref<NotificationPermission>('default'),
  subscribed: ref(false),
  busy: ref(false),
  needsInstall: ref(false),
  subscribe: vi.fn(async () => true),
  unsubscribe: vi.fn(async () => {}),
  sendTest: vi.fn(async () => {}),
}
vi.mock('~/composables/usePush', () => ({ usePush: () => state }))

const { default: PushSettings } = await import('~/components/PushSettings.vue')

function resetState() {
  state.supported.value = true
  state.vapidMissing.value = false
  state.permission.value = 'default'
  state.subscribed.value = false
  state.busy.value = false
  state.needsInstall.value = false
  state.subscribe.mockClear()
  state.unsubscribe.mockClear()
  state.sendTest.mockClear()
}

const NuxtLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const mountSettings = () => mount(PushSettings, { global: { stubs: { NuxtLink: NuxtLinkStub } } })
const toggle = (wrapper: ReturnType<typeof mountSettings>) => wrapper.get('[role="switch"]')

describe('PushSettings', () => {
  beforeEach(resetState)

  it('выключено: приглашение включить, переключатель доступен', () => {
    const wrapper = mountSettings()
    expect(wrapper.text()).toContain('Напомним, когда подойдёт срок ТО')
    expect(toggle(wrapper).attributes('aria-checked')).toBe('false')
    expect(toggle(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Отправить тестовое')
  })

  it('включение подписывает устройство', async () => {
    const wrapper = mountSettings()
    await toggle(wrapper).trigger('click')
    expect(state.subscribe).toHaveBeenCalledOnce()
  })

  it('включено: подпись, тестовое уведомление и выключение', async () => {
    state.subscribed.value = true
    const wrapper = mountSettings()
    expect(wrapper.text()).toContain('Включены на этом устройстве')
    expect(toggle(wrapper).attributes('aria-checked')).toBe('true')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Отправить тестовое')!
      .trigger('click')
    expect(state.sendTest).toHaveBeenCalledOnce()

    await toggle(wrapper).trigger('click')
    expect(state.unsubscribe).toHaveBeenCalledOnce()
  })

  it('отказ в разрешении показывает ошибку', async () => {
    state.subscribe.mockResolvedValueOnce(false)
    const wrapper = mountSettings()
    await toggle(wrapper).trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(wrapper.get('[role="alert"]').text()).toContain('Разрешение на уведомления не выдано')
  })

  interface BlockedCase {
    supported?: boolean
    vapidMissing?: boolean
    needsInstall?: boolean
    permission?: NotificationPermission
  }
  it.each<[string, BlockedCase, string]>([
    ['нет VAPID на сервере', { vapidMissing: true, supported: false }, 'не настроены на сервере'],
    ['браузер без push', { supported: false }, 'Браузер не поддерживает push'],
    ['iOS не в PWA', { needsInstall: true }, 'На iPhone сначала добавьте приложение'],
    ['запрещено в браузере', { permission: 'denied' }, 'запрещены в настройках браузера'],
  ])('%s: переключатель заблокирован, причина названа', (_name, patch, text) => {
    state.supported.value = patch.supported ?? true
    state.vapidMissing.value = patch.vapidMissing ?? false
    state.needsInstall.value = patch.needsInstall ?? false
    state.permission.value = patch.permission ?? 'default'
    const wrapper = mountSettings()
    expect(toggle(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain(text)
  })
})
