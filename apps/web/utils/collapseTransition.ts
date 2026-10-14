/**
 * Хуки для `<Transition name="collapse" v-on="collapseTransitionHooks">` — высота 0 → auto и обратно
 * («09 · Анимации»: «Раскрытие секции», «Офлайн-плашка»). CSS не умеет анимировать до `auto`,
 * поэтому на время перехода высота фиксируется в px, сами переходы — в `assets/css/motion.css`.
 */
function setHeight(element: Element, height: string) {
  ;(element as HTMLElement).style.height = height
}

function clearHeight(element: Element) {
  setHeight(element, '')
}

export const collapseTransitionHooks = {
  onBeforeEnter: (element: Element) => setHeight(element, '0px'),
  onEnter: (element: Element) => setHeight(element, `${element.scrollHeight}px`),
  onAfterEnter: clearHeight,
  onEnterCancelled: clearHeight,
  onBeforeLeave: (element: Element) => setHeight(element, `${element.scrollHeight}px`),
  // Чтение offsetHeight фиксирует стартовую высоту, иначе браузер не увидит перехода к 0
  onLeave: (element: Element) => {
    void (element as HTMLElement).offsetHeight
    setHeight(element, '0px')
  },
  onAfterLeave: clearHeight,
  onLeaveCancelled: clearHeight,
}
