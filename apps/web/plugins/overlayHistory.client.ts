import { settleOverlayHistory } from '~/utils/overlayHistory'

// Переход роутера ждёт, пока история вернётся с записей шторок и диалогов на запись страницы
export default defineNuxtPlugin(() => {
  useRouter().beforeEach(() => settleOverlayHistory())
})
