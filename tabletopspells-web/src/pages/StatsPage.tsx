import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'

const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']

export default function StatsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: character, isLoading } = useQuery({ queryKey: ['character', id], queryFn: () => charactersApi.get(id!), enabled: !!id })
  const [scores, setScores] = useState<Record<string, number> | null>(null)

  const updateMutation = useMutation({
    mutationFn: () => charactersApi.update(id!, { abilityScores: scores! }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['character', id] }); setScores(null) },
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return null

  const editing = scores ?? character.abilityScores

  const modifier = (score: number) => {
    const m = Math.floor((score - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">Stats</h1>
      </header>

      <main className="max-w-lg mx-auto p-6">
        <div className="bg-gray-900 rounded-2xl p-6 mb-4">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Character Info</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-400">Class</p><p className="font-medium">{character.characterClass}</p></div>
            <div><p className="text-gray-400">Level</p><p className="font-medium">{character.level}</p></div>
            <div><p className="text-gray-400">Game</p><p className="font-medium">{character.gameType === 'dnd5e' ? 'D&D 5e' : 'Pathfinder 1e'}</p></div>
            <div><p className="text-gray-400">Caster Type</p><p className="font-medium">{character.isDivineCaster ? 'Divine' : 'Arcane'}</p></div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Ability Scores</h2>
          <div className="grid grid-cols-3 gap-3">
            {ABILITY_KEYS.map((key) => (
              <div key={key} className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{key.slice(0, 3).toUpperCase()}</p>
                <input
                  type="number" min={1} max={30}
                  value={editing[key] ?? 10}
                  onChange={(e) => setScores({ ...(scores ?? character.abilityScores), [key]: +e.target.value })}
                  className="w-full bg-transparent text-white text-xl font-bold text-center focus:outline-none"
                />
                <p className="text-sm text-indigo-400">{modifier(editing[key] ?? 10)}</p>
              </div>
            ))}
          </div>

          {scores && (
            <div className="flex gap-3 mt-4">
              <button onClick={() => setScores(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-sm">
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
