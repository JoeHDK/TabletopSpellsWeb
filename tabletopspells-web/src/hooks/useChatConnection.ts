import { useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import type { ChatMessage, Conversation, ChatParticipant } from '../types'

// Retry forever: 0s, 2s, 10s, 30s, 30s, 30s, …
class ForeverRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(ctx: signalR.RetryContext): number | null {
    const delays = [0, 2_000, 10_000, 30_000]
    return delays[Math.min(ctx.previousRetryCount, delays.length - 1)]
  }
}

let connection: signalR.HubConnection | null = null
let handlersRegistered = false

function getOrCreateConnection(_token: string): signalR.HubConnection {
  // Re-create if the previous connection is fully disconnected (gave up reconnecting)
  if (!connection || connection.state === signalR.HubConnectionState.Disconnected) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/chat', {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
      })
      .withAutomaticReconnect(new ForeverRetryPolicy())
      .build()
    handlersRegistered = false
  }
  return connection
}

/**
 * Establishes (or reuses) the singleton SignalR chat connection and wires up
 * React Query cache updates. Safe to call from multiple components — only one
 * connection is ever alive. Call high in the tree (e.g. ProtectedRoute).
 */
export function useChatConnection() {
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token) return

    const conn = getOrCreateConnection(token)

    // Register event handlers once per connection instance
    if (!handlersRegistered) {
      handlersRegistered = true

      conn.on('ReceiveMessage', (msg: ChatMessage) => {
        qc.setQueryData<{ pages: { messages: ChatMessage[] }[] }>(
          ['chat-messages', msg.conversationId],
          (old) => {
            if (!old) return old
            const pages = [...old.pages]
            if (pages.length === 0) return old
            const last = { ...pages[pages.length - 1] }
            last.messages = [...last.messages, msg]
            pages[pages.length - 1] = last
            return { ...old, pages }
          },
        )
        qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      })

      conn.on('ConversationCreated', (_conv: Conversation) => {
        qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      })

      conn.on('ParticipantAdded', (conversationId: string, _p: ChatParticipant) => {
        qc.invalidateQueries({ queryKey: ['chat-conversation', conversationId] })
      })

      conn.on('ParticipantRemoved', (conversationId: string, _userId: string) => {
        qc.invalidateQueries({ queryKey: ['chat-conversation', conversationId] })
      })

      conn.on('MessageDeleted', (conversationId: string, messageId: string) => {
        qc.setQueryData<{ pages: { messages: ChatMessage[] }[] }>(
          ['chat-messages', conversationId],
          (old) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === messageId ? { ...m, isDeleted: true, content: null } : m,
                ),
              })),
            }
          },
        )
      })
    }

    const start = async () => {
      if (conn.state === signalR.HubConnectionState.Disconnected) {
        try {
          await conn.start()
        } catch (err) {
          console.error('[SignalR] Initial connect failed:', err)
        }
      }
    }

    start()

    return () => {
      // Singleton — don't stop on unmount; logout handles cleanup via token becoming null
    }
  }, [token, qc])

  const joinConversation = async (conversationId: string) => {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke('JoinConversation', conversationId)
  }

  const leaveConversation = async (conversationId: string) => {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke('LeaveConversation', conversationId)
  }

  const sendMessage = async (conversationId: string, content: string) => {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke('SendMessage', conversationId, content)
  }

  return { joinConversation, leaveConversation, sendMessage }
}

