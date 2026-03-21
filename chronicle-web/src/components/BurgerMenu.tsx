import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import { friendsApi } from '../api/friends'
import { chatApi } from '../api/chat'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
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

const NOTIF_ICON: Record<string, string> = {
  GameInvite: '🎲',
  ItemReceived: '🎁',
  ItemSent: '↗️',
  FriendRequest: '👥',
  FriendAccepted: '✅',
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto min-w-[20px] h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none shrink-0">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function BurgerMenu() {
  const [open, setOpen] = useState(false)
  const [notifExpanded, setNotifExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { username, logout } = useAuthStore()
  const { isDark, toggle } = useThemeStore()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchInterval: 30_000,
  })

  const { data: friendRequests = [] } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: friendsApi.getIncomingRequests,
    refetchInterval: 60_000,
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.getConversations,
    refetchInterval: 30_000,
  })

  const unreadNotifs = notifications.filter(n => !n.isRead).length
  const unreadConvs = conversations.filter(c => c.unreadCount > 0).length
  const pendingFriends = friendRequests.length
  const totalBadge = unreadNotifs + unreadConvs + pendingFriends

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteNotifMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleNotifClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id)
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Collapse notification list when menu closes
  useEffect(() => {
    if (!open) setNotifExpanded(false)
  }, [open])

  const nav = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Burger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        className="relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <span className={`block w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">

          {/* Username header */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm text-gray-400">Signed in as</p>
            <p className="text-sm font-semibold text-white truncate">{username}</p>
          </div>

          {/* Nav items */}
          <div className="py-1">

            {/* Friends */}
            <button
              onClick={() => nav('/friends')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">👥</span>
              <span className="flex-1 text-left">Friends</span>
              {pendingFriends > 0 && <Badge count={pendingFriends} />}
            </button>

            {/* Messages */}
            <button
              onClick={() => nav('/chat')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">💬</span>
              <span className="flex-1 text-left">Messages</span>
              {unreadConvs > 0 && <Badge count={unreadConvs} />}
            </button>

            {/* Creature Library */}
            <button
              onClick={() => nav('/creatures')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">🐉</span>
              <span className="flex-1 text-left">Creatures</span>
            </button>

            {/* Notifications — expandable */}
            <button
              onClick={() => setNotifExpanded(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">🔔</span>
              <span className="flex-1 text-left">Notifications</span>
              {unreadNotifs > 0 && <Badge count={unreadNotifs} />}
              <span className={`text-gray-500 text-xs transition-transform duration-200 ${notifExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* Notification list (inline, scrollable) */}
            {notifExpanded && (
              <div className="border-t border-b border-gray-800 bg-gray-950/50">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Recent</span>
                  {unreadNotifs > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 text-xs py-4">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`flex gap-2 px-4 py-2.5 border-b border-gray-800/50 last:border-0 transition-colors ${
                          !n.isRead ? 'bg-indigo-950/30' : ''
                        } ${n.link ? 'cursor-pointer hover:bg-gray-800' : ''}`}
                      >
                        <span className="text-sm shrink-0">{NOTIF_ICON[n.type] ?? '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1">
                            <p className={`text-xs font-medium leading-tight ${!n.isRead ? 'text-white' : 'text-gray-300'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && <span className="shrink-0 w-1.5 h-1.5 mt-1 rounded-full bg-indigo-400" />}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotifMutation.mutate(n.id) }}
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

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Settings */}
          <div className="py-1">
            {/* Account settings */}
            <button
              onClick={() => { setOpen(false); navigate('/settings') }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">⚙️</span>
              <span className="flex-1 text-left">Settings</span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
              <span className="flex-1 text-left">{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>

            {/* Sign out */}
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
            >
              <span className="text-base">🚪</span>
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
