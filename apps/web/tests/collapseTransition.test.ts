import { afterEach, describe, expect, it, vi } from 'vitest'
import { collapseTransitionHooks } from '~/utils/collapseTransition'

const CONTENT_HEIGHT = 120

function createElement(): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: CONTENT_HEIGHT })
  return element
}

/** Журнал: какая высота была в стиле в момент чтения layout (offsetHeight) */
function trackLayoutReads(element: HTMLElement): string[] {
  const heightsAtRead: string[] = []
  Object.defineProperty(element, 'offsetHeight', {
    get: () => {
      heightsAtRead.push(element.style.height)
      return 0
    },
  })
  return heightsAtRead
}

describe('collapseTransitionHooks', () => {
  afterEach(() => vi.restoreAllMocks())

  it('раскрытие: стартовая высота 0 применяется до конечной, иначе блок раскроется рывком', () => {
    const element = createElement()
    const heightsAtRead = trackLayoutReads(element)

    collapseTransitionHooks.onBeforeEnter(element)
    collapseTransitionHooks.onEnter(element)

    expect(heightsAtRead).toEqual(['0px'])
    expect(element.style.height).toBe(`${CONTENT_HEIGHT}px`)
  })

  it('раскрытие: после перехода высота снова auto', () => {
    const element = createElement()
    collapseTransitionHooks.onBeforeEnter(element)
    collapseTransitionHooks.onEnter(element)

    collapseTransitionHooks.onAfterEnter(element)

    expect(element.style.height).toBe('')
  })

  it('сворачивание: стартовая высота фиксируется до перехода к 0', () => {
    const element = createElement()
    const heightsAtRead = trackLayoutReads(element)

    collapseTransitionHooks.onBeforeLeave(element)
    collapseTransitionHooks.onLeave(element)

    expect(heightsAtRead).toEqual([`${CONTENT_HEIGHT}px`])
    expect(element.style.height).toBe('0px')
  })
})
