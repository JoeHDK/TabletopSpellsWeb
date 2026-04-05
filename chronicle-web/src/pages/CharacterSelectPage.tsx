import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { gamesApi } from '../api/games'
import { racesApi } from '../api/races'
import { useCharacterStore } from '../store/characterStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import BurgerMenu from '../components/BurgerMenu'
import type { Character, CreateCharacterRequest, CharacterClass, Game }from '../types'

const CLASSES: CharacterClass[] = [
  'Artificer','Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard',
]

function SectionHeader({ title, count, open, onToggle, children }: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-left flex-1 min-w-0"
        aria-expanded={open}
      >
        <span className="text-2xl font-bold truncate">{title}</span>
        {count > 0 && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full shrink-0">{count}</span>
        )}
        <span className={`text-gray-500 text-sm transition-transform duration-200 shrink-0 ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      <div className="flex gap-2 shrink-0">{children}</div>
    </div>
  )
}

export default function CharacterSelectPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setActive = useCharacterStore((s) => s.setActiveCharacter)

  // Section collapse state — all open by default
  const [charsOpen, setCharsOpen] = useState(true)
  const [npcsOpen, setNpcsOpen] = useState(true)
  const [gamesOpen, setGamesOpen] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [createIsNpc, setCreateIsNpc] = useState(false)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [showJoinGame, setShowJoinGame] = useState(false)
  const [gameName, setGameName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [form, setForm] = useState<CreateCharacterRequest>({
    name: '', characterClass: 'Wizard', gameType: 'dnd5e', level: 1,
  })
  const [confirmDelete, setConfirmDelete] = useState<Character | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, () => setShowCreate(false), showCreate)

  const { data: allCharacters = [], isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: charactersApi.getAll,
  })

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.getAll,
  })

  const { data: allRaces = [] } = useQuery({
    queryKey: ['races'],
    queryFn: () => racesApi.getAll(),
  })

  const characters = allCharacters.filter((c) => !c.isNpc)
  const npcs = allCharacters.filter((c) => c.isNpc)

  const createMutation = useMutation({
    mutationFn: (req: CreateCharacterRequest) => charactersApi.create(req),
    onSuccess: (newChar) => {
      qc.setQueryData<Character[]>(['characters'], (old = []) => [...old, newChar])
      setShowCreate(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => charactersApi.delete(id),
    onSuccess: (_, deletedId) => {
      qc.setQueryData<Character[]>(['characters'], (old = []) => old.filter((c) => c.id !== deletedId))
    },
  })

  const createGameMutation = useMutation({
    mutationFn: () => gamesApi.create({ name: gameName }),
    onSuccess: (game) => {
      qc.invalidateQueries({ queryKey: ['games'] })
      setShowCreateGame(false)
      setGameName('')
      navigate(`/games/${game.id}`)
    },
  })

  const joinGameMutation = useMutation({
    mutationFn: () => gamesApi.joinByCode({ inviteCode: inviteCode.trim().toUpperCase() }),
    onSuccess: (game) => {
      qc.invalidateQueries({ queryKey: ['games'] })
      setShowJoinGame(false)
      setInviteCode('')
      navigate(`/games/${game.id}`)
    },
  })

  const selectCharacter = (c: Character) => {
    setActive(c)
    navigate(`/characters/${c.id}`)
  }

  const openCreate = (isNpc: boolean) => {
    setCreateIsNpc(isNpc)
    setForm({ name: '', characterClass: 'Wizard', gameType: 'dnd5e', level: 1 })
    setShowCreate(true)
  }

  const renderCharacterCard = (c: Character) => (
    <div key={c.id} className="bg-gray-900 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-800 transition-colors">
      <button onClick={() => selectCharacter(c)} className="flex-1 text-left flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
          {c.avatarBase64 ? (
            <img src={c.avatarBase64} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{c.isNpc ? '🎭' : '🧙'}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-lg">{c.name}</p>
          <p className="text-sm text-gray-400">
            {c.characterClass} • Level {c.level} • {c.gameType === 'dnd5e' ? 'D&D 5e' : 'Pathfinder 1e'}
          </p>
        </div>
      </button>
      <button
        onClick={() => setConfirmDelete(c)}
        aria-label={`Delete ${c.name}`}
        className="text-red-500 hover:text-red-400 text-sm px-2"
      >✕</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-400">⚔️ Chronicle</h1>
        <BurgerMenu />
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-10">

        {/* Characters Section */}
        <section>
          <SectionHeader title="Characters" count={characters.length} open={charsOpen} onToggle={() => setCharsOpen((v) => !v)}>
            <button
              onClick={() => openCreate(false)}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
            >
              + New
            </button>
          </SectionHeader>
          {charsOpen && (
            isLoading ? (
              <div className="text-center text-gray-400 py-10">Loading…</div>
            ) : characters.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <p className="text-lg mb-2">No characters yet</p>
                <p className="text-sm">Create your first character to get started</p>
              </div>
            ) : (
              <div className="space-y-3">{characters.map(renderCharacterCard)}</div>
            )
          )}
        </section>

        {/* NPCs Section */}
        <section>
          <SectionHeader title="NPCs" count={npcs.length} open={npcsOpen} onToggle={() => setNpcsOpen((v) => !v)}>
            <button
              onClick={() => openCreate(true)}
              className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg text-sm font-medium"
            >
              + New NPC
            </button>
          </SectionHeader>
          {npcsOpen && (
            isLoading ? (
              <div className="text-center text-gray-400 py-10">Loading…</div>
            ) : npcs.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <p className="text-lg mb-2">No NPCs yet</p>
                <p className="text-sm">Create NPCs to track their stats, spells and gear</p>
              </div>
            ) : (
              <div className="space-y-3">{npcs.map(renderCharacterCard)}</div>
            )
          )}
        </section>

        {/* Adventures Section */}
        <section>
          <SectionHeader title="Adventures" count={games.length} open={gamesOpen} onToggle={() => setGamesOpen((v) => !v)}>
            <button
              onClick={() => setShowJoinGame(true)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-medium"
            >
              Join
            </button>
            <button
              onClick={() => setShowCreateGame(true)}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg text-sm font-medium"
            >
              + New
            </button>
          </SectionHeader>
          {gamesOpen && (
            gamesLoading ? (
              <div className="text-center text-gray-400 py-8">Loading…</div>
            ) : games.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p className="text-lg mb-2">No adventures yet</p>
                <p className="text-sm">Create a game or join one with an invite code</p>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/games/${g.id}`)}
                    className="w-full bg-gray-900 hover:bg-gray-800 rounded-xl p-4 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-lg">{g.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${g.myRole === 'DM' ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300'}`}>
                        {g.myRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      DM: {g.dmUsername} · {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </button>
                ))}
              </div>
            )
          )}
        </section>

      </main>

      {/* Create Game Modal */}
      {showCreateGame && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateGame(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">New Adventure</h3>
            <form onSubmit={(e) => { e.preventDefault(); createGameMutation.mutate() }} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Game Name</label>
                <input
                  required autoFocus value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="e.g. Curse of Strahd"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreateGame(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
                <button type="submit" disabled={createGameMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg">
                  {createGameMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Game Modal */}
      {showJoinGame && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowJoinGame(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Join Adventure</h3>
            <form onSubmit={(e) => { e.preventDefault(); joinGameMutation.mutate() }} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Invite Code</label>
                <input
                  required autoFocus value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3XY7"
                  maxLength={6}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none tracking-widest text-center text-lg font-mono"
                />
              </div>
              {joinGameMutation.isError && (
                <p className="text-red-400 text-sm">Invalid invite code. Check with your DM.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowJoinGame(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
                <button type="submit" disabled={joinGameMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg">
                  {joinGameMutation.isPending ? 'Joining…' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Character / NPC Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowCreate(false)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-char-title" className="bg-gray-900 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 id="create-char-title" className="text-xl font-bold mb-4">
              {createIsNpc ? '🎭 New NPC' : '🧙 New Character'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, isNpc: createIsNpc }) }} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Name</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Class</label>
                  <select
                    value={form.characterClass}
                    onChange={(e) => setForm({ ...form, characterClass: e.target.value as CharacterClass })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                  >
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Game</label>
                  <select
                    value={form.gameType}
                    onChange={(e) => setForm({ ...form, gameType: e.target.value as Game, race: undefined })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                  >
                    <option value="dnd5e">D&D 5e</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Level</label>
                <input
                  type="number" min={1} max={20} value={form.level}
                  onChange={(e) => setForm({ ...form, level: +e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                />
              </div>
              {form.gameType === 'dnd5e' && (
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Race <span className="text-gray-500">(optional)</span></label>
                  <select
                    value={form.race ?? ''}
                    onChange={(e) => setForm({ ...form, race: e.target.value || undefined })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                  >
                    <option value="">— None —</option>
                    {allRaces.map(r => (
                      <option key={r.index} value={r.index}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className={`flex-1 py-2 rounded-lg ${createIsNpc ? 'bg-purple-700 hover:bg-purple-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">Delete {confirmDelete.isNpc ? 'NPC' : 'character'}?</h3>
            <p className="text-gray-400 text-sm mb-6">
              <span className="text-white font-semibold">{confirmDelete.name}</span> will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(confirmDelete.id)
                  setConfirmDelete(null)
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
