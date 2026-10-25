import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Фон плитки логотипа (`Logo / App Icon`): им заливаются поля maskable- и apple-иконок,
// иначе вокруг скруглённого квадрата останется белая рамка
const BRAND_BACKGROUND = '#2648E0'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { ...minimal2023Preset.maskable.resizeOptions, background: BRAND_BACKGROUND },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { ...minimal2023Preset.apple.resizeOptions, background: BRAND_BACKGROUND },
    },
  },
  images: ['public/logo.svg'],
})
