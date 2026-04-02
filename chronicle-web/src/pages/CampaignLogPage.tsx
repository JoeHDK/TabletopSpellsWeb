import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { campaignLogApi } from '../api/campaignLog'
import { useAuthStore } from '../store/authStore'
import type { CampaignLogEntry } from '../types'
import { RichTextEditor, RichTextDisplay } from '../components/RichTextEditor'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function CampaignLogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { userId } = useAuthStore()

  const [search, setSearch] = useState('')
  const [compose, setCompose] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data: game } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['campaign-log', id],
    queryFn: () => campaignLogApi.getAll(id!),
    enabled: !!id,
  })

  const createMutation = useMutation({
    mutationFn: (content: string) => campaignLogApi.create(id!, content),
    onSuccess: (entry) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) => [entry, ...old])
      setCompose('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ entryId, content }: { entryId: string; content: string }) =>
      campaignLogApi.update(id!, entryId, content),
    onSuccess: (updated) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) =>
        old.map(e => e.id === updated.id ? updated : e)
      )
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => campaignLogApi.delete(id!, entryId),
    onSuccess: (_, entryId) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) =>
        old.filter(e => e.id !== entryId)
      )
    },
  })

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      e.content.toLowerCase().includes(q) || e.authorUsername.toLowerCase().includes(q)
    )
  }, [entries, search])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const stripped = compose.replace(/<[^>]*>/g, '').trim()
    if (!stripped) return
    createMutation.mutate(compose)
  }

  const startEdit = (entry: CampaignLogEntry) => {
    setEditingId(entry.id)
    setEditContent(entry.content)
  }

  const submitEdit = (entryId: string) => {
    const stripped = editContent.replace(/<[^>]*>/g, '').trim()
    if (!stripped) return
    updateMutation.mutate({ entryId, content: editContent })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/games/${id}`)}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >←</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">Campaign Log</h1>
          {game && <p className="text-xs text-gray-500 truncate">{game.name}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search log…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
            >✕</button>
          )}
        </div>

        {/* Compose new entry */}
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Add Entry</h2>
          <RichTextEditor
            content={compose}
            onChange={setCompose}
            placeholder="Write a log entry…"
            minRows={4}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending || !compose.replace(/<[^>]*>/g, '').trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              {createMutation.isPending ? 'Saving…' : 'Add to Log'}
            </button>
          </div>
        </form>

        {/* Entry list */}
        {isLoading && (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        )}

        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {search ? 'No entries match your search.' : 'No log entries yet. Add the first one above!'}
          </div>
        )}

        {filteredEntries.map(entry => (
          <div key={entry.id} className="bg-gray-900 rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-indigo-400">{entry.authorUsername}</span>
                <span className="text-xs text-gray-600 ml-2">{formatDate(entry.createdAt)}</span>
                {entry.updatedAt !== entry.createdAt && (
                  <span className="text-[10px] text-gray-600 ml-1">(edited)</span>
                )}
              </div>
              {(entry.authorUserId === userId) && (
                <div className="flex gap-2 shrink-0">
                  {editingId !== entry.id && (
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                    >Edit</button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(entry.id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >Delete</button>
                </div>
              )}
            </div>

            {editingId === entry.id ? (
              <div className="space-y-2">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                  minRows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >Cancel</button>
                  <button
                    onClick={() => submitEdit(entry.id)}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                  >{updateMutation.isPending ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            ) : (
              <RichTextDisplay html={entry.content} />
            )}
          </div>
        ))}

        {search && filteredEntries.length > 0 && (
          <p className="text-xs text-gray-600 text-center">{filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''} for "{search}"</p>
        )}
      </div>
    </div>
  )
}
