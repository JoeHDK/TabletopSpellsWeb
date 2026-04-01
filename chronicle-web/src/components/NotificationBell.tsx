import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import type { Notification } from '../types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_ICON: Record<string, string> = {
  GameInvite: '🎲',
  ItemReceived: '🎁',
  ItemSent: '↗️',
  FriendRequest: '👥',
  FriendAccepted: '✅',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchInterval: 300000, // 5 min fallback — SignalR pushes updates in real-time
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  // App Badge API — shows notification count on the installed PWA icon
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    if (unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {})
    } else {
      navigator.clearAppBadge().catch(() => {})
    }
  }, [unreadCount])

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id)
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-800 last:border-0 transition-colors ${
                    !n.isRead ? 'bg-indigo-950/30' : ''
                  } ${n.link ? 'cursor-pointer hover:bg-gray-800' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${!n.isRead ? 'text-white' : 'text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="shrink-0 w-2 h-2 mt-1 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                    className="shrink-0 text-gray-600 hover:text-red-400 text-xs self-start mt-0.5 transition-colors"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
