import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest'
import {
  pushOverlayEntry,
  releaseOverlayEntry,
  resetOverlayHistory,
  settleOverlayHistory,
} from '~/utils/overlayHistory'

const DEPTH_KEY = 'garageOverlayDepth'
const PAGE_STATE = { position: 4 }

let routerPopState: Mock<(event: PopStateEvent) => void>
let pushState: MockInstance<History['pushState']>
let go: MockInstance<History['go']>

/** Жест «назад»/«вперёд»: браузер выставил запись и прислал popstate */
function popTo(state: unknown) {
  window.dispatchEvent(new PopStateEvent('popstate', { state }))
}

const overlayState = (depth: number) => ({ ...PAGE_STATE, [DEPTH_KEY]: depth })

beforeEach(() => {
  window.history.replaceState(PAGE_STATE, '')
  pushState = vi.spyOn(window.history, 'pushState')
  go = vi.spyOn(window.history, 'go').mockImplementation(() => {})
  // Слушатель роутера регистрируется раньше нашего, но capture-слушатель всё равно идёт первым
  routerPopState = vi.fn<(event: PopStateEvent) => void>()
  window.addEventListener('popstate', routerPopState)
})

afterEach(() => {
  window.removeEventListener('popstate', routerPopState)
  resetOverlayHistory()
  vi.restoreAllMocks()
})

describe('overlayHistory', () => {
  it('открытие добавляет запись истории с тем же адресом и сохраняет состояние роутера', () => {
    const url = window.location.href
    pushOverlayEntry(Symbol('sheet'), vi.fn())

    expect(pushState).toHaveBeenCalledWith({ ...PAGE_STATE, [DEPTH_KEY]: 1 }, '')
    expect(window.location.href).toBe(url)
  })

  it('жест «назад» закрывает оверлей и не доходит до роутера', () => {
    const onBack = vi.fn()
    pushOverlayEntry(Symbol('sheet'), onBack)

    popTo(PAGE_STATE)

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(routerPopState).not.toHaveBeenCalled()
  })

  it('с двумя оверлеями «назад» закрывает только верхний', () => {
    const sheetBack = vi.fn()
    const dialogBack = vi.fn()
    pushOverlayEntry(Symbol('sheet'), sheetBack)
    pushOverlayEntry(Symbol('dialog'), dialogBack)

    popTo(overlayState(1))
    expect(dialogBack).toHaveBeenCalledTimes(1)
    expect(sheetBack).not.toHaveBeenCalled()

    popTo(PAGE_STATE)
    expect(sheetBack).toHaveBeenCalledTimes(1)
    expect(routerPopState).not.toHaveBeenCalled()
  })

  it('программное закрытие возвращает запись и гасит свой popstate', () => {
    const onBack = vi.fn()
    const id = Symbol('sheet')
    pushOverlayEntry(id, onBack)

    releaseOverlayEntry(id)
    expect(go).toHaveBeenCalledWith(-1)

    popTo(PAGE_STATE)
    expect(onBack).not.toHaveBeenCalled()
    expect(routerPopState).not.toHaveBeenCalled()

    // Записи больше нет: следующий настоящий переход назад достаётся роутеру
    popTo({ position: 3 })
    expect(routerPopState).toHaveBeenCalledTimes(1)
  })

  it('нижний оверлей закрылся под верхним — запись уходит вместе с верхним', () => {
    const sheet = Symbol('sheet')
    const dialog = Symbol('dialog')
    pushOverlayEntry(sheet, vi.fn())
    pushOverlayEntry(dialog, vi.fn())

    releaseOverlayEntry(sheet)
    expect(go).not.toHaveBeenCalled()

    releaseOverlayEntry(dialog)
    expect(go).toHaveBeenCalledTimes(1)
    expect(go).toHaveBeenCalledWith(-2)
  })

  it('закрытие незарегистрированного оверлея историю не трогает', () => {
    releaseOverlayEntry(Symbol('unknown'))
    expect(go).not.toHaveBeenCalled()
  })

  it('переход роутера снимает записи оверлеев и ждёт возврата истории', async () => {
    pushOverlayEntry(Symbol('sheet'), vi.fn())
    const onSettled = vi.fn()

    const settled = settleOverlayHistory().then(onSettled)
    expect(go).toHaveBeenCalledWith(-1)
    await Promise.resolve()
    expect(onSettled).not.toHaveBeenCalled()

    popTo(PAGE_STATE)
    await settled
    expect(onSettled).toHaveBeenCalled()
    expect(routerPopState).not.toHaveBeenCalled()
  })

  it('без оверлеев переход роутера не ждёт', async () => {
    await settleOverlayHistory()
    expect(go).not.toHaveBeenCalled()
  })

  it('«вперёд» на запись закрытого оверлея сразу возвращает назад', () => {
    const id = Symbol('sheet')
    pushOverlayEntry(id, vi.fn())
    releaseOverlayEntry(id)
    popTo(PAGE_STATE)
    go.mockClear()

    popTo(overlayState(1))

    expect(go).toHaveBeenCalledWith(-1)
    expect(routerPopState).not.toHaveBeenCalled()
  })

  it('прыжок на другую страницу закрывает оверлей, но переход достаётся роутеру', () => {
    const onBack = vi.fn()
    pushOverlayEntry(Symbol('sheet'), onBack)

    popTo({ position: 2 })

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(routerPopState).toHaveBeenCalledTimes(1)
  })

  it('popstate без оверлеев — обычный переход роутера', () => {
    popTo({ position: 3 })
    expect(routerPopState).toHaveBeenCalledTimes(1)
  })
})
