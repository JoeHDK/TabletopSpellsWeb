import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { friendsApi } from '../api/friends'
import { chatApi } from '../api/chat'
import type { Friend, FriendRequest, UserSearchResult } from '../types'

type Tab = 'friends' | 'requests' | 'find'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return (t === 'requests' || t === 'find') ? t : 'friends'
  })
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: friendsApi.getFriends,
  })

  const { data: requests = [] } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: friendsApi.getIncomingRequests,
    refetchInterval: 30_000,
  })

  const sendMutation = useMutation({
    mutationFn: (username: string) => friendsApi.sendRequest(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      // Refresh search results to reflect new pending status
      if (searchQ.length >= 2) handleSearch()
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (req: FriendRequest) => friendsApi.acceptRequest(req.id),
    onSuccess: (_, req) => {
      // Instantly update both caches to avoid IDB stale-data race
      qc.setQueryData<FriendRequest[]>(['friend-requests'], old =>
        (old ?? []).filter(r => r.id !== req.id)
      )
      qc.setQueryData<Friend[]>(['friends'], old =>
        [...(old ?? []), { userId: req.requesterId, username: req.requesterUsername }]
      )
    },
  })

  const declineMutation = useMutation({
    mutationFn: (id: string) => friendsApi.declineRequest(id),
    onSuccess: (_, id) => {
      qc.setQueryData<FriendRequest[]>(['friend-requests'], old =>
        (old ?? []).filter(r => r.id !== id)
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => friendsApi.removeFriend(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })

  const dmMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      chatApi.getOrCreateDirect({ targetUserId }),
    onSuccess: (conv) => navigate(`/chat/${conv.id}`),
  })

  const handleSearch = async () => {
    if (searchQ.trim().length < 2) return
    setSearching(true)
    try {
      const results = await friendsApi.searchUsers(searchQ.trim())
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  const friendshipStatusLabel = (status: UserSearchResult['friendshipStatus']) => {
    if (!status) return null
    if (status === 'Accepted') return <span className="text-xs text-green-500">Friends</span>
    if (status === 'Pending') return <span className="text-xs text-yellow-500">Pending</span>
    if (status === 'Blocked') return <span className="text-xs text-red-500">Blocked</span>
    return null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/characters')} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="flex-1 font-bold text-lg">
          Friends
          {requests.length > 0 && (
            <span className="ml-2 bg-indigo-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
              {requests.length}
            </span>
          )}
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {(['friends', 'requests', 'find'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'requests' ? (
              <>
                Requests
                {requests.length > 0 && (
                  <span className="ml-1.5 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {requests.length}
                  </span>
                )}
              </>
            ) : t === 'friends' ? `Friends (${friends.length})` : 'Find People'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4">

        {/* Friends list */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">
                No friends yet. Search for people in the "Find People" tab.
              </p>
            )}
            {friends.map((f) => (
              <div
                key={f.userId}
                className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">👤</span>
                <span className="flex-1 font-semibold text-sm">{f.username}</span>
                <button
                  onClick={() => dmMutation.mutate(f.userId)}
                  disabled={dmMutation.isPending}
                  className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
                  title="Send message"
                >
                  💬 DM
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${f.username} as a friend?`)) removeMutation.mutate(f.userId)
                  }}
                  className="text-xs text-gray-600 hover:text-red-400 px-2 py-1.5 rounded-lg transition-colors"
                  title="Remove friend"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Incoming requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">No pending friend requests.</p>
            )}
            {requests.map((r) => (
              <div
                key={r.id}
                className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">👤</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{r.requesterUsername}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => acceptMutation.mutate(r)}
                  disabled={acceptMutation.isPending}
                  className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineMutation.mutate(r.id)}
                  disabled={declineMutation.isPending}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Find people */}
        {tab === 'find' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Search by username…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searchQ.trim().length < 2 || searching}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((u) => (
                  <div
                    key={u.userId}
                    className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">👤</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{u.username}</p>
                      {friendshipStatusLabel(u.friendshipStatus)}
                    </div>
                    {!u.friendshipStatus && (
                      <button
                        onClick={() => sendMutation.mutate(u.username)}
                        disabled={sendMutation.isPending}
                        className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        + Add
                      </button>
                    )}
                    {u.friendshipStatus === 'Accepted' && (
                      <button
                        onClick={() => dmMutation.mutate(u.userId)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        💬 DM
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
