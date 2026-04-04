import { useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import type { Notification } from '../types'

class ForeverRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(ctx: signalR.RetryContext): number | null {
    const delays = [0, 2_000, 10_000, 30_000]
    return delays[Math.min(ctx.previousRetryCount, delays.length - 1)]
  }
}

let connection: signalR.HubConnection | null = null
let handlersRegistered = false

function getOrCreateConnection(_token: string): signalR.HubConnection {
  if (!connection || connection.state === signalR.HubConnectionState.Disconnected) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
      })
      .withAutomaticReconnect(new ForeverRetryPolicy())
      .build()
    handlersRegistered = false
  }
  return connection
}

/**
 * Establishes the SignalR notifications hub connection.
 * Incoming ReceiveNotification events are prepended into the React Query
 * ['notifications'] cache so the UI updates immediately without a round-trip.
 * Mount once, high in the tree (e.g. ProtectedRoute).
 */
export function useNotificationHub() {
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token) return

    const conn = getOrCreateConnection(token)

    if (!handlersRegistered) {
      conn.on('ReceiveNotification', (notif: Notification) => {
        qc.setQueryData<Notification[]>(['notifications'], (old = []) => [notif, ...old])
        qc.invalidateQueries({ queryKey: ['notifications'] })
      })
      handlersRegistered = true
    }

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      conn.start().catch(() => { /* retry handled by withAutomaticReconnect */ })
    }

    return () => {
      // Don't stop the connection on unmount — it's a long-lived singleton.
    }
  }, [token, qc])
}
