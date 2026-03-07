import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/chat'
import { friendsApi } from '../api/friends'
import { useAuthStore } from '../store/authStore'
import type { Conversation } from '../types'

function conversationLabel(conv: Conversation, myUserId: string): string {
  if (conv.type === 'Direct') {
    const other = conv.participants.find((p) => p.userId !== myUserId)
    return other?.username ?? 'Direct Message'
  }
  return conv.name ?? 'Group'
}

function conversationIcon(type: Conversation['type']): string {
  if (type === 'Direct') return '💬'
  if (type === 'GameRoom') return '🎲'
  return '👥'
}

export default function ConversationListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const myUserId = useAuthStore((s) => s.userId) ?? ''

  const [showNewDm, setShowNewDm] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupFriendIds, setGroupFriendIds] = useState<string[]>([])

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.getConversations,
    refetchInterval: 30_000,
  })

  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: friendsApi.getFriends,
    enabled: showNewDm || showNewGroup,
  })

  const dmMutation = useMutation({
    mutationFn: () => chatApi.getOrCreateDirect({ targetUserId: selectedFriendId }),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      setShowNewDm(false)
      setSelectedFriendId('')
      navigate(`/chat/${conv.id}`)
    },
  })

  const groupMutation = useMutation({
    mutationFn: () =>
      chatApi.createGroup({
        name: groupName.trim(),
        participantUserIds: groupFriendIds,
      }),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      setShowNewGroup(false)
      setGroupName('')
      setGroupFriendIds([])
      navigate(`/chat/${conv.id}`)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading…
      </div>
    )
  }

  const totalUnread = conversations.reduce((n, c) => n + c.unreadCount, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/characters')} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="flex-1 font-bold text-lg">
          Messages
          {totalUnread > 0 && (
            <span className="ml-2 bg-indigo-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
              {totalUnread}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowNewDm(true); setShowNewGroup(false) }}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
            title="New Direct Message"
          >
            + DM
          </button>
          <button
            onClick={() => { setShowNewGroup(true); setShowNewDm(false) }}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
            title="New Group Chat"
          >
            + Group
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-3">

        {/* New DM form — pick from friends */}
        {showNewDm && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-300">New Direct Message</p>
            {friends.length === 0 ? (
              <p className="text-xs text-gray-500">
                Add friends first via the <button onClick={() => navigate('/friends')} className="text-indigo-400 underline">Friends</button> page.
              </p>
            ) : (
              <select
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
              >
                <option value="">Select a friend…</option>
                {friends.map((f) => (
                  <option key={f.userId} value={f.userId}>{f.username}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowNewDm(false); setSelectedFriendId('') }}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFriendId || dmMutation.isPending}
                onClick={() => dmMutation.mutate()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* New Group form — pick from friends */}
        {showNewGroup && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-300">New Group Chat</p>
            <input
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {friends.length === 0 ? (
              <p className="text-xs text-gray-500">
                Add friends first to invite them to a group chat.
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-400">Select friends to add:</p>
                {friends.map((f) => (
                  <label key={f.userId} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupFriendIds.includes(f.userId)}
                      onChange={(e) =>
                        setGroupFriendIds((prev) =>
                          e.target.checked ? [...prev, f.userId] : prev.filter((id) => id !== f.userId)
                        )
                      }
                      className="accent-indigo-500"
                    />
                    {f.username}
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowNewGroup(false); setGroupName(''); setGroupFriendIds([]) }}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!groupName.trim() || groupMutation.isPending}
                onClick={() => groupMutation.mutate()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Conversation list */}
        {conversations.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">
            No conversations yet. Start a DM or join a game room.
          </p>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => navigate(`/chat/${conv.id}`)}
            className="w-full bg-gray-900 hover:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-colors"
          >
            <span className="text-2xl shrink-0">{conversationIcon(conv.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {conversationLabel(conv, myUserId)}
              </p>
              {conv.lastMessage && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {conv.lastMessage.isDeleted
                    ? '🗑 Message deleted'
                    : conv.lastMessage.senderUsername
                      ? `${conv.lastMessage.senderUsername}: …`
                      : '…'}
                </p>
              )}
            </div>
            {conv.unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shrink-0">
                {conv.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
