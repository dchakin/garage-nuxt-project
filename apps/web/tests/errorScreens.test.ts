import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorScreen from '~/components/errors/ErrorScreen.vue'
import { errorScreens, resolveErrorKind } from '~/utils/errorScreens'
import { loginLocation, safeRedirect } from '~/utils/redirectTarget'

describe('resolveErrorKind', () => {
  it.each([
    [401, 'session-expired'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [500, 'server'],
    [502, 'server'],
    [undefined, 'server'],
  ])('статус %s → %s', (statusCode, kind) => {
    expect(resolveErrorKind(statusCode)).toBe(kind)
  })
})

describe('ErrorScreen', () => {
  it.each(Object.entries(errorScreens))('%s: заголовок и пояснение из словаря', (kind, content) => {
    const wrapper = mount(ErrorScreen, { props: { kind: kind as keyof typeof errorScreens } })

    expect(wrapper.get('h2').text()).toBe(content.title)
    expect(wrapper.text()).toContain(content.message)
    expect(wrapper.attributes('data-error-kind')).toBe(kind)
  })

  it('кнопки приходят в слоте actions', () => {
    const wrapper = mount(ErrorScreen, {
      props: { kind: 'forbidden' },
      slots: { actions: '<button>К моим машинам</button>' },
    })

    expect(wrapper.get('button').text()).toBe('К моим машинам')
  })

  it('без слота кнопок нет; message заменяет пояснение', () => {
    const wrapper = mount(ErrorScreen, { props: { kind: 'server', message: 'Своё пояснение' } })

    expect(wrapper.text()).toContain('Своё пояснение')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

describe('safeRedirect', () => {
  it('пропускает путь внутри приложения вместе с query', () => {
    expect(safeRedirect('/cars/7/journal')).toBe('/cars/7/journal')
    expect(safeRedirect('/cars/7/expenses?period=year')).toBe('/cars/7/expenses?period=year')
  })

  it.each([
    undefined,
    null,
    '',
    'cars',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
  ])('отвергает %j', (value) => {
    expect(safeRedirect(value)).toBe('/cars')
  })

  it('не возвращает обратно на экраны входа', () => {
    expect(safeRedirect('/login')).toBe('/cars')
    expect(safeRedirect('/register?x=1')).toBe('/cars')
  })

  it('берёт первое значение из повторяющегося параметра и уважает fallback', () => {
    expect(safeRedirect(['/profile', '/cars'])).toBe('/profile')
    expect(safeRedirect('//x', '/')).toBe('/')
  })
})

describe('loginLocation', () => {
  it('кодирует маршрут в redirect', () => {
    expect(loginLocation('/cars/7/journal?type=repair')).toBe(
      '/login?redirect=%2Fcars%2F7%2Fjournal%3Ftype%3Drepair',
    )
  })

  it('корень, небезопасный и пустой маршрут — просто /login', () => {
    expect(loginLocation('/')).toBe('/login')
    expect(loginLocation('//evil.example')).toBe('/login')
    expect(loginLocation('/login')).toBe('/login')
    expect(loginLocation('')).toBe('/login')
  })
})
