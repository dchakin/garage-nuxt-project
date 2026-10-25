import { startOverlayHistory } from '~/utils/overlayHistory'

// Слушатель `popstate` должен встать раньше vue-router (плагин `nuxt:router` создаёт историю при
// старте), иначе он не сможет скрыть от роутера события оверлеев: порядок вызова — порядок подписки
export default defineNuxtPlugin({
  name: 'overlay-history-listener',
  order: -100,
  setup() {
    startOverlayHistory()
  },
})
