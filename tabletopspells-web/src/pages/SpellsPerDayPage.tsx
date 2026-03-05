import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsPerDayApi } from '../api/spells'
import { charactersApi } from '../api/characters'

export default function SpellsPerDayPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: character } = useQuery({ queryKey: ['character', id], queryFn: () => charactersApi.get(id!), enabled: !!id })
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['spellsPerDay', id],
    queryFn: () => spellsPerDayApi.getToday(id!),
    enabled: !!id,
  })

  const useMutation_ = useMutation({
    mutationFn: ({ level, used, max }: { level: number; used: number; max: number }) =>
      spellsPerDayApi.upsert(id!, level, { spellLevel: level, maxSlots: max, usedSlots: used }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spellsPerDay', id] }),
  })

  const maxSlotMap = character?.maxSpellsPerDay ?? {}
  const levels = Object.keys(maxSlotMap).map(Number).sort()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">Spells Per Day</h1>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading…</div>
        ) : levels.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No spell slots configured.</p>
            <p className="text-sm mt-1">Update your character's spell slots first.</p>
          </div>
        ) : (
          levels.map((level) => {
            const max = maxSlotMap[level] ?? 0
            const slotData = slots.find((s) => s.spellLevel === level)
            const used = slotData?.usedSlots ?? 0

            return (
              <div key={level} className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">{level === 0 ? 'Cantrips' : `Level ${level} Slots`}</span>
                  <span className="text-sm text-gray-400">{max - used} remaining</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: max }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        useMutation_.mutate({
                          level, max,
                          used: i < used ? i : i + 1,
                        })
                      }
                      aria-label={`${level === 0 ? 'Cantrip' : `Level ${level}`} slot ${i + 1}, ${i < used ? 'used' : 'available'}`}
                      aria-pressed={i < used}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        i < used
                          ? 'bg-indigo-600 border-indigo-500'
                          : 'bg-gray-800 border-gray-600 hover:border-indigo-500'
                      }`}
                    />
                  ))}
                </div>
                {used > 0 && (
                  <button
                    onClick={() => useMutation_.mutate({ level, max, used: 0 })}
                    className="mt-2 text-xs text-gray-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
