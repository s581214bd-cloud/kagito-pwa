import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KAGITO',
        short_name: 'KAGITO',
        lang: 'ja',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0d1a2f',
        background_color: '#0d1a2f',
        icons: [{ src: '/kagito-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'test-results/**', 'node_modules/**'],
  },
})
