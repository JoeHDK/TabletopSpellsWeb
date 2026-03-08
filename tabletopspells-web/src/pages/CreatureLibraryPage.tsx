import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { monstersApi } from '../api/monsters'
import type { MonsterSummary, Monster } from '../types'
import CreatureStatBlockModal from '../components/CreatureStatBlockModal'

function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

export default function CreatureLibraryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [minCr, setMinCr] = useState('')
  const [maxCr, setMaxCr] = useState('')
  const [selected, setSelected] = useState<Monster | null>(null)

  const params = {
    search: search || undefined,
    type: typeFilter || undefined,
    minCr: minCr ? Number(minCr) : undefined,
    maxCr: maxCr ? Number(maxCr) : undefined,
  }

  const { data: monsters = [], isLoading } = useQuery<MonsterSummary[]>({
    queryKey: ['monsters', params],
    queryFn: () => monstersApi.getAll(params),
  })

  const { data: types = [] } = useQuery<string[]>({
    queryKey: ['monster-types'],
    queryFn: monstersApi.getTypes,
    staleTime: Infinity,
  })

  const { data: fullMonster, isLoading: isLoadingDetail } = useQuery<Monster>({
    queryKey: ['monster', selected?.name],
    queryFn: () => monstersApi.getByName(selected!.name),
    enabled: !!selected,
    staleTime: Infinity,
  })

  const handleCardClick = (m: MonsterSummary) => {
    setSelected(m as Monster)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">🐉 Creature Library</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search creatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">CR</span>
            <input
              type="number"
              placeholder="Min"
              value={minCr}
              onChange={(e) => setMinCr(e.target.value)}
              min={0}
              step={0.25}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-gray-500">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxCr}
              onChange={(e) => setMaxCr(e.target.value)}
              min={0}
              step={0.25}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <p className="text-center text-gray-500 py-16">Loading creatures...</p>
        ) : monsters.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No creatures found.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{monsters.length} creature{monsters.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monsters.map((m) => (
                <button
                  key={m.name}
                  onClick={() => handleCardClick(m)}
                  className="bg-gray-900 border border-gray-700 hover:border-indigo-500 rounded-lg px-4 py-3 text-left transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{m.name}</span>
                    <span className="text-xs font-bold text-amber-400">CR {crDisplay(m.cr)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{m.size} {m.type}{m.subtype ? ` (${m.subtype})` : ''}</span>
                    <span>·</span>
                    <span>AC {m.ac}</span>
                    <span>·</span>
                    <span>HP {m.hp}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stat block modal */}
      {selected && (
        isLoadingDetail ? (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <p className="text-white">Loading...</p>
          </div>
        ) : fullMonster ? (
          <CreatureStatBlockModal
            monster={fullMonster}
            onClose={() => setSelected(null)}
          />
        ) : null
      )}
    </div>
  )
}
