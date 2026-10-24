const CAR_UNAVAILABLE_STATUSES = [403, 404]
const FALLBACK_STATUS_CODE = 500

/**
 * Машина не открылась: 403 (чужая или убрали из участников) и 404 (нет такой) — экраны И6/И4,
 * прочие сбои — И5. Открытую «последней» машину забываем, чтобы `/` не вёл на неё снова.
 */
export function useCarUnavailable() {
  const { getLastCarId, forgetLastCar } = useLastCar()

  function statusOf(error: unknown): number | undefined {
    return (error as { statusCode?: number } | null)?.statusCode
  }

  function isCarUnavailable(error: unknown): boolean {
    return CAR_UNAVAILABLE_STATUSES.includes(statusOf(error) ?? 0)
  }

  function showCarError(error: unknown, carId: number) {
    if (isCarUnavailable(error) && getLastCarId() === carId) forgetLastCar()
    return showError(
      createError({ statusCode: statusOf(error) ?? FALLBACK_STATUS_CODE, fatal: true }),
    )
  }

  return { isCarUnavailable, showCarError }
}
