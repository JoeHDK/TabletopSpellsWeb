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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Chronicle',
        short_name: 'Chronicle',
        description: 'Manage your D&D 5e and Pathfinder 1e spells',
        theme_color: '#1e1b4b',
        background_color: '#0f0f23',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true, // bind to 0.0.0.0 so other devices on the network can connect
    proxy: {
      '/api': { target: 'https://localhost', changeOrigin: true, secure: false },
      '/hubs': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
        ws: true, // proxy WebSocket upgrades for SignalR
      },
    },
  },
})
