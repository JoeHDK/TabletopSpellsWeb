import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/chat'
import { useAuthStore } from '../store/authStore'
import { useChatConnection } from '../hooks/useChatConnection'
import type { ChatMessage } from '../types'

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const myUserId = useAuthStore((s) => s.userId) ?? ''
  const { joinConversation, leaveConversation, sendMessage: sendViaHub } = useChatConnection()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: conv } = useQuery({
    queryKey: ['chat-conversation', id],
    queryFn: () => chatApi.getConversation(id!),
    enabled: !!id,
  })

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat-messages', id],
    queryFn: ({ pageParam }) =>
      chatApi.getMessages(id!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!id,
  })

  const messages: ChatMessage[] = pages?.pages.flatMap((p) => p.messages) ?? []

  // Join SignalR group on mount, leave on unmount
  useEffect(() => {
    if (!id) return
    joinConversation(id)
    return () => { leaveConversation(id) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark read when opening the conversation
  useEffect(() => {
    if (!id) return
    chatApi.markRead(id).catch(() => {})
    qc.invalidateQueries({ queryKey: ['chat-conversations'] })
  }, [id, qc])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => chatApi.deleteMessage(id!, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-messages', id] }),
  })

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !id) return
    setInput('')
    try {
      await sendViaHub(id, text)
    } catch {
      // Fallback to REST if SignalR not connected
      await chatApi.sendMessage(id, { content: text })
      qc.invalidateQueries({ queryKey: ['chat-messages', id] })
    }
  }, [input, id, sendViaHub, qc])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const convName = (() => {
    if (!conv) return '…'
    if (conv.type === 'Direct') {
      const other = conv.participants.find((p) => p.userId !== myUserId)
      return other?.username ?? 'Direct Message'
    }
    return conv.name ?? 'Group'
  })()

  const typeIcon = conv?.type === 'Direct' ? '💬' : conv?.type === 'GameRoom' ? '🎲' : '👥'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/chat')} className="text-gray-400 hover:text-white">
          ←
        </button>
        <span className="text-xl">{typeIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{convName}</p>
          {conv && conv.type !== 'Direct' && (
            <p className="text-xs text-gray-500">
              {conv.participants.length} participant{conv.participants.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {hasNextPage && (
          <div className="flex justify-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && !isFetchingNextPage && (
          <p className="text-center text-gray-600 text-sm py-8">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderId === myUserId
          const prevMsg = messages[i - 1]
          const showSender = !prevMsg || prevMsg.senderId !== msg.senderId

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {showSender && !isMe && (
                  <span className="text-xs text-gray-500 mb-0.5 px-1">{msg.senderUsername}</span>
                )}
                <div className="group relative">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      msg.isDeleted
                        ? 'bg-gray-800 text-gray-600 italic'
                        : isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-100'
                    }`}
                  >
                    {msg.isDeleted ? 'Message deleted' : msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[10px] text-gray-600">{formatTime(msg.sentAt)}</span>
                    {isMe && !msg.isDeleted && (
                      <button
                        onClick={() => deleteMutation.mutate(msg.id)}
                        className="text-[10px] text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        title="Delete message"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 max-h-32 overflow-y-auto"
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
