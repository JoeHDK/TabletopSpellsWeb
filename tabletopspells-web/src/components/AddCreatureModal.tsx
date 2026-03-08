import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { monstersApi } from '../api/monsters'
import type { MonsterSummary } from '../types'

interface Props {
  gameRoomId: string
  onClose: () => void
  onAdd: (data: {
    displayName: string
    monsterName?: string
    maxHp: number
    armorClass: number
    initiative?: number
  }) => void
}

function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

export default function AddCreatureModal({ onClose, onAdd }: Props) {
  const [tab, setTab] = useState<'library' | 'custom'>('library')
  const [search, setSearch] = useState('')
  const [selectedMonster, setSelectedMonster] = useState<MonsterSummary | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')
  const [initiative, setInitiative] = useState('')

  const { data: monsters = [], isLoading } = useQuery<MonsterSummary[]>({
    queryKey: ['monsters-search', search],
    queryFn: () => monstersApi.getAll({ search: search || undefined }),
    enabled: tab === 'library',
    staleTime: 30_000,
  })

  const handleSelectMonster = (m: MonsterSummary) => {
    setSelectedMonster(m)
    setDisplayName(m.name)
    setHp(String(m.hp))
    setAc(String(m.ac))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !hp || !ac) return
    onAdd({
      displayName: displayName.trim(),
      monsterName: tab === 'library' ? selectedMonster?.name : undefined,
      maxHp: Number(hp),
      armorClass: Number(ac),
      initiative: initiative ? Number(initiative) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-base font-bold text-white">Add Creature</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setTab('library')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'library' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            📚 From Library
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'custom' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            ✏️ Custom
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {tab === 'library' && (
            <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
              <input
                type="text"
                placeholder="Search creatures..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {isLoading ? (
                  <p className="text-center text-gray-500 text-sm py-4">Loading...</p>
                ) : monsters.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">No results</p>
                ) : (
                  monsters.slice(0, 50).map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => handleSelectMonster(m)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedMonster?.name === m.name
                          ? 'bg-indigo-900/50 border border-indigo-500'
                          : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                      }`}
                    >
                      <span className="text-sm text-white">{m.name}</span>
                      <span className="text-xs text-gray-400">CR {crDisplay(m.cr)} · AC {m.ac} · HP {m.hp}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Common fields (shown for both tabs; pre-filled from library selection) */}
          <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={tab === 'library' ? 'e.g. Goblin 1' : 'Creature name'}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Max HP</label>
                <input
                  type="number"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  min={1}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">AC</label>
                <input
                  type="number"
                  value={ac}
                  onChange={(e) => setAc(e.target.value)}
                  min={1}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Initiative</label>
                <input
                  type="number"
                  value={initiative}
                  onChange={(e) => setInitiative(e.target.value)}
                  placeholder="–"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!displayName.trim() || !hp || !ac}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              Add to Encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
