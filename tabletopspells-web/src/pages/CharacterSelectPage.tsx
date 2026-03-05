import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { useCharacterStore } from '../store/characterStore'
import { useAuthStore } from '../store/authStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import DarkModeToggle from '../components/DarkModeToggle'
import type { Character, CreateCharacterRequest, CharacterClass, Game } from '../types'

const CLASSES: CharacterClass[] = [
  'Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue',
  'Sorcerer','Wizard','Warlock','Artificer','Inquisitor','Summoner','Witch',
  'Alchemist','Magus','Oracle','Shaman','Spiritualist','Occultist','Psychic','Mesmerist',
]

export default function CharacterSelectPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setActive = useCharacterStore((s) => s.setActiveCharacter)
  const { username, logout } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateCharacterRequest>({
    name: '', characterClass: 'Wizard', gameType: 'dnd5e', level: 1,
  })
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, () => setShowCreate(false), showCreate)

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: charactersApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (req: CreateCharacterRequest) => charactersApi.create(req),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['characters'] }); setShowCreate(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => charactersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const selectCharacter = (c: Character) => {
    setActive(c)
    navigate(`/characters/${c.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-400">⚔️ TabletopSpells</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{username}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Sign out</button>
          <DarkModeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Characters</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New Character
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading…</div>
        ) : characters.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg mb-2">No characters yet</p>
            <p className="text-sm">Create your first character to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map((c) => (
              <div key={c.id} className="bg-gray-900 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-800 transition-colors">
                <button onClick={() => selectCharacter(c)} className="flex-1 text-left">
                  <p className="font-semibold text-lg">{c.name}</p>
                  <p className="text-sm text-gray-400">
                    {c.characterClass} • Level {c.level} • {c.gameType === 'dnd5e' ? 'D&D 5e' : 'Pathfinder 1e'}
                  </p>
                </button>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="text-red-500 hover:text-red-400 text-sm px-2"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Character Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowCreate(false)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-char-title" className="bg-gray-900 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 id="create-char-title" className="text-xl font-bold mb-4">New Character</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
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
                    onChange={(e) => setForm({ ...form, gameType: e.target.value as Game })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                  >
                    <option value="dnd5e">D&D 5e</option>
                    <option value="pathfinder1e">Pathfinder 1e</option>
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
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg">
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
