/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Take control immediately when a new service worker is installed
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Inject the Vite-generated precache manifest
precacheAndRoute(self.__WB_MANIFEST)

// SPA fallback — any navigation request returns index.html
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'))
)

// NetworkFirst for all mutable user-data API calls — always tries network, falls back to
// cache only when offline. Fixes stale-on-first-reload caused by StaleWhileRevalidate.
// Excludes: auth, notifications, push (not cached), and static compendium routes below.
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/spells/') &&
    !url.pathname.startsWith('/api/races') &&
    !url.pathname.startsWith('/api/backgrounds') &&
    !url.pathname.startsWith('/api/feats') &&
    !url.pathname.startsWith('/api/classes') &&
    !url.pathname.startsWith('/api/beasts') &&
    !url.pathname.startsWith('/api/auth/') &&
    !url.pathname.startsWith('/api/notifications') &&
    !url.pathname.startsWith('/api/push/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 })],
  })
)

// CacheFirst for static compendium data that rarely/never changes
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/races') ||
    url.pathname.startsWith('/api/backgrounds') ||
    url.pathname.startsWith('/api/feats') ||
    url.pathname.startsWith('/api/classes') ||
    url.pathname.startsWith('/api/beasts'),
  new CacheFirst({
    cacheName: 'compendium-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7 })],
  })
)

// CacheFirst for spell/item compendium data (rarely changes)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/spells/'),
  new CacheFirst({
    cacheName: 'spells-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7 })],
  })
)

// ── Web Push ─────────────────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Chronicle', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Chronicle', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url: string = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
