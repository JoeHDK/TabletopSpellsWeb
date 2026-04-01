import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await api.get<{ publicKey: string }>('/push/vapid-key')
    return res.data.publicKey
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buffer
}

/**
 * Requests Notification permission and registers a Web Push subscription
 * with the backend. Safe to call on every mount — the backend upserts on
 * the (userId, endpoint) pair so duplicate calls are idempotent.
 * Only runs when the user is authenticated, the browser supports push,
 * and the server has VAPID keys configured.
 */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token)
  const attempted = useRef(false)

  useEffect(() => {
    if (!token || attempted.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    attempted.current = true

    const subscribe = async () => {
      try {
        const publicKey = await getVapidPublicKey()
        if (!publicKey) return // VAPID not configured on this server

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          // Re-register in case the server lost it
          const json = existing.toJSON()
          await api.post('/push/subscribe', {
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          })
          return
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        const json = subscription.toJSON()
        await api.post('/push/subscribe', {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        })
      } catch {
        // Push not available or blocked — silently ignore
      }
    }

    subscribe()
  }, [token])
}
