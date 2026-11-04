import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// "Treasure Map" is a separate site that only shares this repository and
// its GitHub Pages deploy with the trip companion: its own entry, build
// output (dist/treasure, built after the main site), manifest, service
// worker (scoped to /treasure/) and storage.
const BASE_PATH = '/JapanTrip_website/treasure/'

export default defineConfig({
  root: fileURLToPath(new URL('./treasure', import.meta.url)),
  base: BASE_PATH,
  publicDir: fileURLToPath(new URL('./treasure/public', import.meta.url)),
  server: { fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] } },
  build: {
    outDir: fileURLToPath(new URL('./dist/treasure', import.meta.url)),
    emptyOutDir: true,
    // places data and Leaflet are bundled on purpose (offline); ~180 kB gzipped.
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react({ compiler: true }),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'מפת האוצר - יפן 2026',
        short_name: 'מפת האוצר',
        description: 'מדריך גילוי לכל ערי הטיול: אוכל, אנימה, Hard Off, מקדשים ומכסי ביוב',
        lang: 'he',
        dir: 'rtl',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        background_color: '#0B1626',
        theme_color: '#0B1626',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Street_Map\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'treasure-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(?:en|he)\.wikipedia\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'treasure-wiki',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'treasure-wiki-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
