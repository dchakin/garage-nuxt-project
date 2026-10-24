/** Плашка «Создали N напоминаний» на «Обзоре» после мастера первого запуска (А6) */
export interface OnboardingBannerState {
  carId: number
  count: number
}

export function useOnboardingBanner() {
  const banner = useState<OnboardingBannerState | null>('onboardingBanner', () => null)

  function showBanner(carId: number, count: number) {
    banner.value = { carId, count }
  }

  function dismissBanner() {
    banner.value = null
  }

  return { banner, showBanner, dismissBanner }
}
