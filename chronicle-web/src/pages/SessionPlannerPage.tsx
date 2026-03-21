import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { sessionNotesApi } from '../api/sessionNotes'
import { encounterTemplatesApi } from '../api/encounterTemplates'
import { monstersApi } from '../api/monsters'
import type { SessionNote, EncounterTemplate, MonsterSummary } from '../types'
import { RichTextEditor, RichTextDisplay } from '../components/RichTextEditor'

// ── Inline creature picker used inside encounter draft editing ─────────────────

function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

interface AddCreatureInlineProps {
  onAdd: (data: { displayName: string; monsterName?: string; maxHp: number; armorClass: number }) => void
}

function AddCreatureInline({ onAdd }: AddCreatureInlineProps) {
  const [tab, setTab] = useState<'library' | 'custom'>('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MonsterSummary | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')
  const [count, setCount] = useState(1)

  const { data: monsters = [] } = useQuery<MonsterSummary[]>({
    queryKey: ['monsters-picker', search],
    queryFn: () => monstersApi.getAll({ search: search || undefined }),
    staleTime: 30_000,
  })

  const handleSelect = (m: MonsterSummary) => {
    setSelected(m)
    setDisplayName(m.name)
    setHp(String(m.hp))
    setAc(String(m.ac))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !hp || !ac) return
    const baseName = displayName.trim()
    const n = Math.max(1, count)
    for (let i = 1; i <= n; i++) {
      onAdd({
        displayName: n > 1 ? `${baseName} ${i}` : baseName,
        monsterName: tab === 'library' ? selected?.name : undefined,
        maxHp: Number(hp),
        armorClass: Number(ac),
      })
    }
    setCount(1)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`px-2 py-1 rounded transition-colors ${tab === 'library' ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          From Library
        </button>
        <button
          type="button"
          onClick={() => setTab('custom')}
          className={`px-2 py-1 rounded transition-colors ${tab === 'custom' ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Custom
        </button>
      </div>

      {tab === 'library' && (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Search monsters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {monsters.slice(0, 30).map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => handleSelect(m)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors ${
                  selected?.name === m.name ? 'bg-indigo-900/60 border border-indigo-600' : 'hover:bg-gray-700'
                }`}
              >
                <span className="text-xs text-white">{m.name}</span>
                <span className="text-[10px] text-gray-400">CR {crDisplay(m.cr)} · AC {m.ac} · HP {m.hp}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name (e.g. Goblin)"
            required
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <input
          type="number"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          placeholder="HP"
          min={1}
          required
          className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <input
          type="number"
          value={ac}
          onChange={(e) => setAc(e.target.value)}
          placeholder="AC"
          min={1}
          required
          className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">×</span>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
            min={1}
            max={20}
            title="Quantity"
            className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={!displayName.trim() || !hp || !ac}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1 rounded transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  )
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

interface SessionsTabProps {
  gameRoomId: string
}

function SessionsTab({ gameRoomId }: SessionsTabProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const { data: notes = [] } = useQuery<SessionNote[]>({
    queryKey: ['session-notes', gameRoomId],
    queryFn: () => sessionNotesApi.getAll(gameRoomId),
  })

  const { data: templates = [] } = useQuery<EncounterTemplate[]>({
    queryKey: ['encounter-templates', gameRoomId],
    queryFn: () => encounterTemplatesApi.getAll(gameRoomId),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => sessionNotesApi.create(gameRoomId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-notes', gameRoomId] })
      setNewTitle('')
      setNewContent('')
      setShowNew(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; content: string } }) =>
      sessionNotesApi.update(gameRoomId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-notes', gameRoomId] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionNotesApi.delete(gameRoomId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-notes', gameRoomId] }),
  })

  const launchMutation = useMutation({
    mutationFn: (templateId: string) => encounterTemplatesApi.launch(gameRoomId, templateId),
    onSuccess: (encounter) => {
      qc.setQueryData(['encounter', gameRoomId], encounter)
      navigate(`/games/${gameRoomId}/combat`)
    },
  })

  const linkDraftMutation = useMutation({
    mutationFn: ({ templateId, templateName, sessionId }: { templateId: string; templateName: string; sessionId: string | null }) =>
      encounterTemplatesApi.update(gameRoomId, templateId, {
        name: templateName,
        ...(sessionId ? { sessionId } : { unlinkSession: true }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter-templates', gameRoomId] }),
  })

  const startEdit = (note: SessionNote) => {
    setEditing(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">{notes.length} session{notes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showNew ? 'Cancel' : '+ New Session'}
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ title: newTitle, content: newContent }) }}
          className="bg-gray-800 rounded-xl p-4 space-y-2"
        >
          <input
            type="text"
            placeholder="Session title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <RichTextEditor
            content={newContent}
            onChange={setNewContent}
            placeholder="Session notes, story hooks, NPC ideas…"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNew(false)} className="text-sm text-gray-400 hover:text-white px-3 py-1">Cancel</button>
            <button
              type="submit"
              disabled={!newTitle.trim() || createMutation.isPending}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 && !showNew && (
        <p className="text-center text-gray-500 py-10">No sessions yet. Add one to start planning.</p>
      )}

      {notes.map((note) => {
        const linkedDrafts = templates.filter((t) => t.sessionId === note.id)
        return (
          <div key={note.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {editing === note.id ? (
              <form
                onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: note.id, data: { title: editTitle, content: editContent } }) }}
                className="p-4 space-y-2"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <RichTextEditor
                  key={note.id}
                  content={editContent}
                  onChange={setEditContent}
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1">Cancel</button>
                  <button
                    type="submit"
                    disabled={!editTitle.trim() || updateMutation.isPending}
                    className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-white">{note.title}</h3>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(note)} className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Edit</button>
                    <button
                      onClick={() => { if (confirm(`Delete "${note.title}"?`)) deleteMutation.mutate(note.id) }}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {note.content && (
                  <RichTextDisplay html={note.content} className="mt-1" />
                )}

                {linkedDrafts.length > 0 && (
                  <div className="mt-3 border-t border-gray-800 pt-3 space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Linked encounter drafts</p>
                    {linkedDrafts.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 py-1 px-2 bg-gray-800 rounded-lg">
                        <span className="text-sm text-white flex-1">{d.name}</span>
                        <span className="text-xs text-gray-500">{d.creatures.length} creature{d.creatures.length !== 1 ? 's' : ''}</span>
                        <button
                          onClick={() => linkDraftMutation.mutate({ templateId: d.id, templateName: d.name, sessionId: null })}
                          disabled={linkDraftMutation.isPending}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                          title="Unlink"
                        >
                          Unlink
                        </button>
                        <button
                          onClick={() => launchMutation.mutate(d.id)}
                          disabled={launchMutation.isPending}
                          className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-2 py-0.5 rounded transition-colors"
                        >
                          ⚔ Launch
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Link an unlinked draft to this session */}
                {templates.filter((t) => !t.sessionId).length > 0 && (
                  <div className="mt-3 border-t border-gray-800 pt-3 flex items-center gap-2">
                    <label className="text-xs text-gray-500 shrink-0">Link a draft:</label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const tmpl = templates.find((t) => t.id === e.target.value)
                        if (tmpl) linkDraftMutation.mutate({ templateId: tmpl.id, templateName: tmpl.name, sessionId: note.id })
                        e.target.value = ''
                      }}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">— choose draft —</option>
                      {templates.filter((t) => !t.sessionId).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Encounter Drafts Tab ───────────────────────────────────────────────────────

interface EncounterDraftsTabProps {
  gameRoomId: string
}

function EncounterDraftsTab({ gameRoomId }: EncounterDraftsTabProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editingCreature, setEditingCreature] = useState<string | null>(null)
  const [editCreatureName, setEditCreatureName] = useState('')
  const [editCreatureHp, setEditCreatureHp] = useState('')
  const [editCreatureAc, setEditCreatureAc] = useState('')
  const [addMoreCount, setAddMoreCount] = useState(1)

  const { data: templates = [] } = useQuery<EncounterTemplate[]>({
    queryKey: ['encounter-templates', gameRoomId],
    queryFn: () => encounterTemplatesApi.getAll(gameRoomId),
  })

  const createMutation= useMutation({
    mutationFn: (name: string) => encounterTemplatesApi.create(gameRoomId, name),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['encounter-templates', gameRoomId] })
      setNewName('')
      setShowNew(false)
      setExpanded(t.id)
      setAddingTo(t.id)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; sessionId?: string | null; unlinkSession?: boolean } }) =>
      encounterTemplatesApi.update(gameRoomId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encounter-templates', gameRoomId] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => encounterTemplatesApi.delete(gameRoomId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter-templates', gameRoomId] }),
  })

  const addCreatureMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Parameters<typeof encounterTemplatesApi.addCreature>[2] }) =>
      encounterTemplatesApi.addCreature(gameRoomId, templateId, data),
    onSuccess: (updated) => {
      qc.setQueryData<EncounterTemplate[]>(['encounter-templates', gameRoomId], (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)) ?? [updated],
      )
    },
  })

  const updateCreatureMutation = useMutation({
    mutationFn: ({ templateId, creatureId, data }: { templateId: string; creatureId: string; data: Parameters<typeof encounterTemplatesApi.updateCreature>[3] }) =>
      encounterTemplatesApi.updateCreature(gameRoomId, templateId, creatureId, data),
    onSuccess: (updated) => {
      qc.setQueryData<EncounterTemplate[]>(['encounter-templates', gameRoomId], (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)) ?? [updated],
      )
      setEditingCreature(null)
    },
  })

  const removeCreatureMutation = useMutation({
    mutationFn: ({ templateId, creatureId }: { templateId: string; creatureId: string }) =>
      encounterTemplatesApi.removeCreature(gameRoomId, templateId, creatureId),
    onSuccess: (updated) => {
      qc.setQueryData<EncounterTemplate[]>(['encounter-templates', gameRoomId], (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)) ?? [],
      )
    },
  })

  const launchMutation = useMutation({
    mutationFn: (templateId: string) => encounterTemplatesApi.launch(gameRoomId, templateId),
    onSuccess: (encounter) => {
      qc.setQueryData(['encounter', gameRoomId], encounter)
      navigate(`/games/${gameRoomId}/combat`)
    },
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">{templates.length} draft{templates.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showNew ? 'Cancel' : '+ New Draft'}
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newName) }}
          className="bg-gray-800 rounded-xl p-4 flex gap-2"
        >
          <input
            type="text"
            placeholder="Encounter name (e.g. Goblin Ambush)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create
          </button>
        </form>
      )}

      {templates.length === 0 && !showNew && (
        <p className="text-center text-gray-500 py-10">No encounter drafts yet. Build one and launch it during play.</p>
      )}

      {templates.map((t) => {
        const isExpanded = expanded === t.id
        return (
          <div key={t.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isExpanded ? null : t.id)}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(isExpanded ? null : t.id)}
                className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
              >
                <span className={`text-gray-500 text-xs transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                {editingId === t.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: t.id, data: { name: editName } }) }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex gap-2 flex-1"
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="text-xs text-green-400 hover:text-green-300">✓</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
                  </form>
                ) : (
                  <span className="font-semibold text-white truncate">{t.name}</span>
                )}
                <span className="text-xs text-gray-500 shrink-0 ml-1">{t.creatures.length} creature{t.creatures.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setEditingId(t.id); setEditName(t.name) }}
                  className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id) }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => launchMutation.mutate(t.id)}
                  disabled={launchMutation.isPending}
                  className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors font-medium"
                >
                  ⚔ Launch
                </button>
              </div>
            </div>

            {/* Expanded creature list */}
            {isExpanded && (
              <div className="border-t border-gray-800 px-4 py-3 space-y-2">
                {t.creatures.length === 0 ? (
                  <p className="text-xs text-gray-500">No creatures yet. Add some below.</p>
                ) : (
                  <div className="space-y-1">
                    {t.creatures.map((c) => {
                      const isEditingThis = editingCreature === c.id
                      return (
                        <div key={c.id} className="rounded-lg border border-transparent hover:border-gray-700 transition-colors">
                          {/* Row */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingThis) {
                                setEditingCreature(null)
                              } else {
                                setEditingCreature(c.id)
                                setEditCreatureName(c.displayName)
                                setEditCreatureHp(String(c.maxHp))
                                setEditCreatureAc(String(c.armorClass))
                                setAddMoreCount(1)
                              }
                            }}
                            className="w-full flex items-center gap-2 py-1.5 px-2 text-left rounded-lg"
                          >
                            <span className={`text-[10px] transition-transform ${isEditingThis ? 'rotate-90' : ''} text-gray-600`}>▶</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white">{c.displayName}</span>
                              {c.monsterName && c.monsterName !== c.displayName && (
                                <span className="text-xs text-gray-500 ml-2">({c.monsterName})</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">HP {c.maxHp}</span>
                            <span className="text-xs text-gray-500">AC {c.armorClass}</span>
                          </button>

                          {/* Inline edit panel */}
                          {isEditingThis && (
                            <div className="mx-2 mb-2 p-3 bg-gray-800 rounded-lg space-y-2 border border-gray-700">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-3">
                                  <label className="text-[10px] text-gray-400 uppercase tracking-wide">Name</label>
                                  <input
                                    type="text"
                                    value={editCreatureName}
                                    onChange={(e) => setEditCreatureName(e.target.value)}
                                    autoFocus
                                    className="w-full mt-0.5 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 uppercase tracking-wide">HP</label>
                                  <input
                                    type="number"
                                    value={editCreatureHp}
                                    onChange={(e) => setEditCreatureHp(e.target.value)}
                                    min={1}
                                    className="w-full mt-0.5 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 uppercase tracking-wide">AC</label>
                                  <input
                                    type="number"
                                    value={editCreatureAc}
                                    onChange={(e) => setEditCreatureAc(e.target.value)}
                                    min={1}
                                    className="w-full mt-0.5 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 uppercase tracking-wide">Amount</label>
                                  <input
                                    type="number"
                                    value={addMoreCount}
                                    onChange={(e) => setAddMoreCount(Math.max(1, Number(e.target.value)))}
                                    min={1}
                                    max={20}
                                    title="Total copies of this creature (replaces current)"
                                    className="w-full mt-0.5 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!editCreatureName.trim() || !editCreatureHp || !editCreatureAc) return
                                    // Save name/hp/ac edits
                                    updateCreatureMutation.mutate({
                                      templateId: t.id,
                                      creatureId: c.id,
                                      data: { displayName: editCreatureName.trim(), maxHp: Number(editCreatureHp), armorClass: Number(editCreatureAc) },
                                    })
                                    // Add extra copies if amount > 1
                                    const base = editCreatureName.trim()
                                    const existing = t.creatures.length
                                    for (let i = 1; i < addMoreCount; i++) {
                                      addCreatureMutation.mutate({
                                        templateId: t.id,
                                        data: {
                                          displayName: `${base} ${existing + i}`,
                                          monsterName: c.monsterName ?? undefined,
                                          maxHp: Number(editCreatureHp),
                                          armorClass: Number(editCreatureAc),
                                        },
                                      })
                                    }
                                  }}
                                  disabled={updateCreatureMutation.isPending || !editCreatureName.trim()}
                                  className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCreature(null)}
                                  className="text-xs text-gray-400 hover:text-white px-2 py-1.5 transition-colors"
                                >
                                  Cancel
                                </button>
                                <div className="flex-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeCreatureMutation.mutate({ templateId: t.id, creatureId: c.id })
                                    setEditingCreature(null)
                                  }}
                                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {addingTo === t.id ? (
                  <div>
                    <AddCreatureInline
                      onAdd={(data) => addCreatureMutation.mutate({ templateId: t.id, data })}
                    />
                    <button
                      onClick={() => setAddingTo(null)}
                      className="text-xs text-gray-500 hover:text-white mt-2"
                    >
                      Done adding
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(t.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    + Add creature
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SessionPlannerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'sessions' | 'drafts'>('sessions')

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!game || game.myRole !== 'DM') return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Access denied</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/games/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">📋 Session Planner</h1>
          <p className="text-xs text-gray-400">{game.name}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 flex">
        <button
          onClick={() => setTab('sessions')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'sessions' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          📅 Sessions
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'drafts' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          ⚔️ Encounter Drafts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full">
        {tab === 'sessions' ? (
          <SessionsTab gameRoomId={id!} />
        ) : (
          <EncounterDraftsTab gameRoomId={id!} />
        )}
      </div>
    </div>
  )
}
