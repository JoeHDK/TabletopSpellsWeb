import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import type { Encounter } from '../types'

class ForeverRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(ctx: signalR.RetryContext): number | null {
    const delays = [0, 2_000, 10_000, 30_000]
    return delays[Math.min(ctx.previousRetryCount, delays.length - 1)]
  }
}

let connection: signalR.HubConnection | null = null
let handlersRegistered = false

function getOrCreateConnection(): signalR.HubConnection {
  if (!connection || connection.state === signalR.HubConnectionState.Disconnected) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/encounter', {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
      })
      .withAutomaticReconnect(new ForeverRetryPolicy())
      .build()
    handlersRegistered = false
  }
  return connection
}

/**
 * Establishes (or reuses) the singleton SignalR encounter connection.
 * Listening for `EncounterUpdated` events and syncs the React Query cache
 * for the given game room. Safe to mount from multiple components.
 */
export function useEncounterConnection(gameRoomId: string) {
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!token || !gameRoomId) return

    const conn = getOrCreateConnection()

    if (!handlersRegistered) {
      handlersRegistered = true

      conn.on('EncounterUpdated', (encounter: Encounter | null) => {
        qc.setQueryData(['encounter', encounter?.gameRoomId ?? gameRoomId], encounter)
        qc.invalidateQueries({ queryKey: ['encounter', encounter?.gameRoomId ?? gameRoomId] })
      })
    }

    const start = async () => {
      if (conn.state === signalR.HubConnectionState.Disconnected) {
        try {
          await conn.start()
        } catch (err) {
          console.error('[SignalR] Encounter connect failed:', err)
        }
      }
      if (!joinedRef.current && conn.state === signalR.HubConnectionState.Connected) {
        await conn.invoke('JoinEncounter', gameRoomId)
        joinedRef.current = true
      }
    }

    start()

    return () => {
      if (joinedRef.current && conn.state === signalR.HubConnectionState.Connected) {
        conn.invoke('LeaveEncounter', gameRoomId).catch(() => {})
        joinedRef.current = false
      }
    }
  }, [token, gameRoomId, qc])
}
