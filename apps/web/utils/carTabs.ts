/** Вкладки нижней панели машины (`UiTabBar`) и их маршруты */
export const CAR_TABS = ['overview', 'journal', 'reminders', 'expenses'] as const

export type CarTab = (typeof CAR_TABS)[number]

/** `/cars/7` для «Обзора», `/cars/7/journal` для остальных */
export function carTabPath(carId: number, tab: CarTab): string {
  return tab === 'overview' ? `/cars/${carId}` : `/cars/${carId}/${tab}`
}
