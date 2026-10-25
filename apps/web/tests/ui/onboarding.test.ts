import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import UiAlert from '~/components/ui/Alert.vue'
import UiButton from '~/components/ui/Button.vue'
import UiCard from '~/components/ui/Card.vue'
import UiDisclosure from '~/components/ui/Disclosure.vue'
import UiField from '~/components/ui/Field.vue'
import UiRowToggle from '~/components/ui/RowToggle.vue'
import CarStep from '~/components/onboarding/CarStep.vue'
import RemindersStep from '~/components/onboarding/RemindersStep.vue'
import { createCarStepValues } from '~/utils/onboardingCar'
import { createTemplateDrafts } from '~/utils/onboardingReminders'

const push = {
  supported: ref(true),
  vapidMissing: ref(false),
  permission: ref<NotificationPermission>('default'),
  subscribed: ref(false),
  busy: ref(false),
  needsInstall: ref(false),
  subscribe: vi.fn(async () => true),
}
vi.mock('~/composables/usePush', () => ({ usePush: () => push }))

const { default: OnboardingBanner } = await import('~/components/overview/OnboardingBanner.vue')

const components = { UiAlert, UiButton, UiCard, UiDisclosure, UiField, UiRowToggle }

describe('CarStep', () => {
  it('без марки, модели и пробега не идёт дальше и показывает ошибки', async () => {
    const wrapper = mount(CarStep, {
      props: { modelValue: createCarStepValues() },
      global: { components },
    })
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('next')).toBeUndefined()
    const text = wrapper.text()
    expect(text).toContain('Укажите марку')
    expect(text).toContain('Укажите модель')
    expect(text).toContain('Укажите текущий пробег')
  })

  it('с заполненными обязательными полями эмитит next; нулевой пробег допустим', async () => {
    const wrapper = mount(CarStep, {
      props: {
        modelValue: { ...createCarStepValues(), brand: 'Kia', model: 'Rio', currentMileage: 0 },
      },
      global: { components },
    })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('год вне диапазона блокирует переход', async () => {
    const wrapper = mount(CarStep, {
      props: {
        modelValue: {
          ...createCarStepValues(),
          brand: 'Kia',
          model: 'Rio',
          currentMileage: 10,
          year: '1800',
        },
      },
      global: { components },
    })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('next')).toBeUndefined()
    expect(wrapper.text()).toContain('Год от 1900 до 2100')
  })
})

describe('RemindersStep', () => {
  function mountStep(props: Record<string, unknown> = {}) {
    return mount(RemindersStep, {
      props: { modelValue: createTemplateDrafts(), today: '2026-10-10', ...props },
      global: { components },
    })
  }

  it('показывает все шаблоны, у ОСАГО — «Полис действует до», у масла — «Указать, когда меняли»', () => {
    const wrapper = mountStep()
    expect(wrapper.findAll('li')).toHaveLength(5)
    const oil = wrapper.find('[data-testid="onboarding-template-oil"]')
    expect(oil.text().replaceAll(' ', ' ')).toContain('Каждые 10 000 км или 12 мес')
    expect(oil.text()).toContain('Указать, когда меняли')
    const policy = wrapper.find('[data-testid="onboarding-template-osago"]')
    expect(policy.text()).toContain('Полис действует до')
    expect(policy.text()).not.toContain('Указать, когда меняли')
  })

  it('кнопка считает включённые напоминания; без них — «Продолжить без напоминаний»', () => {
    expect(mountStep().find('button[type="submit"]').text()).toBe('Создать 3 напоминания')

    const drafts = createTemplateDrafts()
    Object.values(drafts).forEach((draft) => (draft.enabled = false))
    expect(mountStep({ modelValue: drafts }).find('button[type="submit"]').text()).toBe(
      'Продолжить без напоминаний',
    )

    const single = createTemplateDrafts()
    single.osago.enabled = false
    single.inspection.enabled = false
    expect(mountStep({ modelValue: single }).find('button[type="submit"]').text()).toBe(
      'Создать 1 напоминание',
    )
  })

  it('эмитит back и submit; ошибка сохранения видна в плашке', async () => {
    const wrapper = mountStep({ error: 'Нет сети' })
    expect(wrapper.find('[role="alert"]').text()).toContain('Нет сети')

    const buttons = wrapper.findAll('button')
    await buttons.find((button) => button.text() === 'Назад')!.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })
})

describe('OnboardingBanner', () => {
  beforeEach(() => {
    push.supported.value = true
    push.permission.value = 'default'
    push.subscribed.value = false
    push.needsInstall.value = false
    push.subscribe.mockClear()
  })

  function mountBanner(count: number) {
    return mount(OnboardingBanner, { props: { count }, global: { components } })
  }

  it('склоняет «напоминание» и показывает «Включить push»', () => {
    expect(mountBanner(1).text()).toContain('Создали 1 напоминание')
    expect(mountBanner(3).text()).toContain('Создали 3 напоминания')
    expect(mountBanner(5).text()).toContain('Создали 5 напоминаний')
    expect(mountBanner(3).text()).toContain('Включить push')
  })

  it('«Включить push» подписывает, «Скрыть» эмитит dismiss', async () => {
    const wrapper = mountBanner(3)
    const buttons = wrapper.findAll('button')
    await buttons.find((button) => button.text() === 'Включить push')!.trigger('click')
    expect(push.subscribe).toHaveBeenCalledTimes(1)

    await buttons.find((button) => button.text() === 'Скрыть')!.trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it.each([
    ['push не поддерживается', () => (push.supported.value = false)],
    ['разрешение запрещено', () => (push.permission.value = 'denied')],
    ['уже подписаны', () => (push.subscribed.value = true)],
    ['iOS вне PWA', () => (push.needsInstall.value = true)],
  ])('кнопки «Включить push» нет: %s', (_case, arrange) => {
    arrange()
    const text = mountBanner(3).text()
    expect(text).not.toContain('Включить push')
    expect(text).toContain('Скрыть')
  })
})
