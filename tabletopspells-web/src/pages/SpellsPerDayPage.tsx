import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsPerDayApi } from '../api/spells'
import { charactersApi } from '../api/characters'

export default function SpellsPerDayPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editingLevel, setEditingLevel] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')

  const { data: character } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })
  const { data: slots = [] } = useQuery({
    queryKey: ['spellsPerDay', id],
    queryFn: () => spellsPerDayApi.getToday(id!),
    enabled: !!id,
  })

  const updateMaxMutation = useMutation({
    mutationFn: (newMax: Record<number, number>) =>
      charactersApi.update(id!, { maxSpellsPerDay: newMax }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character', id] })
      setEditingLevel(null)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const maxSlotMap = character?.maxSpellsPerDay ?? {}
      await Promise.all(
        Object.keys(maxSlotMap).map((lvl) =>
          spellsPerDayApi.upsert(id!, Number(lvl), {
            spellLevel: Number(lvl),
            maxSlots: maxSlotMap[Number(lvl)],
            usedSlots: 0,
          })
        )
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spellsPerDay', id] }),
  })

  const maxSlotMap = character?.maxSpellsPerDay ?? {}

  const openEdit = (level: number) => {
    setEditingLevel(level)
    setInputValue(String(maxSlotMap[level] ?? 0))
  }

  const saveMax = () => {
    if (editingLevel === null) return
    const newVal = parseInt(inputValue, 10)
    if (isNaN(newVal) || newVal < 0) return
    const updated = { ...maxSlotMap, [editingLevel]: newVal }
    updateMaxMutation.mutate(updated)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">Spells Per Day</h1>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-4">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => {
          const max = maxSlotMap[level] ?? 0
          const slotData = slots.find((s) => s.spellLevel === level)
          const used = slotData?.usedSlots ?? 0
          const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0

          return (
            <div key={level} className="bg-gray-900 rounded-xl p-4">
              <p className="font-semibold mb-3">Level {level}</p>
              <button
                onClick={() => openEdit(level)}
                className="w-full relative h-10 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-indigo-500 transition-colors"
                aria-label={`Level ${level}: ${used} of ${max} used. Tap to configure.`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium z-10">
                  {max === 0 ? <span className="text-gray-500">Tap to configure</span> : `${used} / ${max}`}
                </span>
              </button>
            </div>
          )
        })}
      </main>

      <div className="p-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="w-full py-3 rounded-xl bg-amber-700/40 hover:bg-amber-700/70 text-amber-300 font-medium transition-colors disabled:opacity-50"
        >
          🌙 Long Rest — Reset All Slots
        </button>
      </div>

      {editingLevel !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setEditingLevel(null)}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Level {editingLevel} Spells</h2>
            <p className="text-sm text-gray-400 mb-4">How many level {editingLevel} spells can you cast per day?</p>
            <input
              type="number"
              min={0}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveMax()}
              autoFocus
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-center text-2xl font-bold mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setEditingLevel(null)} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors">Cancel</button>
              <button
                onClick={saveMax}
                disabled={updateMaxMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
