import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'TabletopSpells',
        short_name: 'TabletopSpells',
        description: 'Manage your D&D 5e and Pathfinder 1e spells',
        theme_color: '#1e1b4b',
        background_color: '#0f0f23',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Cache all API GET responses with NetworkFirst (tries network, falls back to cache)
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Keep long-lived CacheFirst for the static spell/item compendium data
            urlPattern: /\/api\/spells\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'spells-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // bind to 0.0.0.0 so other devices on the network can connect
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/hubs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // proxy WebSocket upgrades for SignalR
      },
    },
  },
})
