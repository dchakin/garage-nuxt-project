/**
 * Хуки для `<Transition name="collapse" v-bind="collapseTransitionHooks">` — высота 0 → auto и обратно
 * («09 · Анимации»: «Раскрытие секции», «Офлайн-плашка»). CSS не умеет анимировать до `auto`,
 * поэтому на время перехода высота фиксируется в px, сами переходы — в `assets/css/motion.css`.
 */
function setHeight(element: Element, height: string) {
  ;(element as HTMLElement).style.height = height
}

function clearHeight(element: Element) {
  setHeight(element, '')
}

/** Читаем layout, чтобы браузер применил стартовую высоту до того, как мы зададим конечную */
function flushLayout(element: Element) {
  void (element as HTMLElement).offsetHeight
}

export const collapseTransitionHooks = {
  onBeforeEnter: (element: Element) => setHeight(element, '0px'),
  // Без принудительного layout элемент ни разу не рисуется с высотой 0 и раскрывается рывком,
  // а шторка вместе с ним «прыгает»: transition стартует только от посчитанного стиля
  onEnter: (element: Element) => {
    flushLayout(element)
    setHeight(element, `${element.scrollHeight}px`)
  },
  onAfterEnter: clearHeight,
  onEnterCancelled: clearHeight,
  onBeforeLeave: (element: Element) => setHeight(element, `${element.scrollHeight}px`),
  // Чтение offsetHeight фиксирует стартовую высоту, иначе браузер не увидит перехода к 0
  onLeave: (element: Element) => {
    flushLayout(element)
    setHeight(element, '0px')
  },
  onAfterLeave: clearHeight,
  onLeaveCancelled: clearHeight,
}
