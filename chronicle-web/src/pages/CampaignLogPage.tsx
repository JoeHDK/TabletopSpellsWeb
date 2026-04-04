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

function entryLabel(entry: CampaignLogEntry) {
  return entry.title?.trim() || `Entry — ${formatDate(entry.createdAt)}`
}

// ── Collapsible log entry card ────────────────────────────────────────────────

interface LogEntryCardProps {
  entry: CampaignLogEntry
  userId: string | null
  defaultOpen: boolean
  onEdit: (entry: CampaignLogEntry) => void
  onDelete: (id: string) => void
  isDeleting: boolean
  editingId: string | null
  editTitle: string
  editContent: string
  onEditTitleChange: (v: string) => void
  onEditContentChange: (v: string) => void
  onEditCancel: () => void
  onEditSave: (id: string) => void
  isSaving: boolean
}

function LogEntryCard({
  entry, userId, defaultOpen,
  onEdit, onDelete, isDeleting,
  editingId, editTitle, editContent,
  onEditTitleChange, onEditContentChange,
  onEditCancel, onEditSave, isSaving,
}: LogEntryCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isEditing = editingId === entry.id
  const canEdit = entry.authorUserId === userId

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => !isEditing && setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-gray-500 text-xs shrink-0 select-none">{open ? '▼' : '▶'}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-white truncate block">{entryLabel(entry)}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
            <span className="text-indigo-400 font-medium">{entry.authorUsername}</span>
            <span>·</span>
            <span>{formatDate(entry.createdAt)}</span>
            {entry.updatedAt !== entry.createdAt && <span className="italic">(edited)</span>}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            {!isEditing && (
              <button
                onClick={() => { setOpen(true); onEdit(entry) }}
                className="text-xs text-gray-500 hover:text-indigo-400 transition-colors px-1"
              >Edit</button>
            )}
            <button
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-1"
            >Delete</button>
          </div>
        )}
      </button>

      {/* Collapsible body */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? '100000px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4 pt-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={e => onEditTitleChange(e.target.value)}
                placeholder="Entry title…"
                maxLength={200}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <RichTextEditor
                content={editContent}
                onChange={onEditContentChange}
                minRows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onEditCancel}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >Cancel</button>
                <button
                  onClick={() => onEditSave(entry.id)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                >{isSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <RichTextDisplay html={entry.content} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignLogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { userId } = useAuthStore()

  const [search, setSearch] = useState('')
  const [composeTitle, setComposeTitle] = useState('')
  const [composeContent, setComposeContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
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
    mutationFn: (payload: { title?: string; content: string }) =>
      campaignLogApi.create(id!, payload),
    onSuccess: (entry) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) => [entry, ...old])
      qc.invalidateQueries({ queryKey: ['campaign-log', id] })
      setComposeTitle('')
      setComposeContent('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ entryId, title, content }: { entryId: string; title?: string; content: string }) =>
      campaignLogApi.update(id!, entryId, { title, content }),
    onSuccess: (updated) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) =>
        old.map(e => e.id === updated.id ? updated : e)
      )
      qc.invalidateQueries({ queryKey: ['campaign-log', id] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => campaignLogApi.delete(id!, entryId),
    onSuccess: (_, entryId) => {
      qc.setQueryData<CampaignLogEntry[]>(['campaign-log', id], (old = []) =>
        old.filter(e => e.id !== entryId)
      )
      qc.invalidateQueries({ queryKey: ['campaign-log', id] })
    },
  })

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      (e.title ?? '').toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.authorUsername.toLowerCase().includes(q)
    )
  }, [entries, search])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const stripped = composeContent.replace(/<[^>]*>/g, '').trim()
    if (!stripped) return
    createMutation.mutate({ title: composeTitle.trim() || undefined, content: composeContent })
  }

  const startEdit = (entry: CampaignLogEntry) => {
    setEditingId(entry.id)
    setEditTitle(entry.title ?? '')
    setEditContent(entry.content)
  }

  const submitEdit = (entryId: string) => {
    const stripped = editContent.replace(/<[^>]*>/g, '').trim()
    if (!stripped) return
    updateMutation.mutate({ entryId, title: editTitle.trim() || undefined, content: editContent })
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
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">New Entry</h2>
          <input
            type="text"
            value={composeTitle}
            onChange={e => setComposeTitle(e.target.value)}
            placeholder="Entry title…"
            maxLength={200}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <RichTextEditor
            content={composeContent}
            onChange={setComposeContent}
            placeholder="Write a log entry…"
            minRows={4}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending || !composeContent.replace(/<[^>]*>/g, '').trim()}
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

        {filteredEntries.map((entry, idx) => (
          <LogEntryCard
            key={entry.id}
            entry={entry}
            userId={userId}
            defaultOpen={idx === 0 && !search}
            onEdit={startEdit}
            onDelete={id => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
            editingId={editingId}
            editTitle={editTitle}
            editContent={editContent}
            onEditTitleChange={setEditTitle}
            onEditContentChange={setEditContent}
            onEditCancel={() => setEditingId(null)}
            onEditSave={submitEdit}
            isSaving={updateMutation.isPending}
          />
        ))}

        {search && filteredEntries.length > 0 && (
          <p className="text-xs text-gray-600 text-center">{filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''} for "{search}"</p>
        )}
      </div>
    </div>
  )
}
