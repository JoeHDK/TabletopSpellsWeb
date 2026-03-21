import { useEffect } from 'react'
import { getExpectedSpellSlots } from '../utils/spellSlotsTable'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsPerDayApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import { classResourcesApi } from '../api/classResources'
import EditableNumber from '../components/EditableNumber'

export default function SpellsPerDayPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', id] }),
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const maxSlotMap = character?.maxSpellsPerDay ?? {}
      await Promise.all([
        ...Object.keys(maxSlotMap).map((lvl) =>
          spellsPerDayApi.upsert(id!, Number(lvl), {
            spellLevel: Number(lvl),
            maxSlots: maxSlotMap[Number(lvl)],
            usedSlots: 0,
          })
        ),
        classResourcesApi.longRest(id!),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spellsPerDay', id] })
      qc.invalidateQueries({ queryKey: ['classResources', id] })
    },
  })

  const maxSlotMap = character?.maxSpellsPerDay ?? {}

  const expectedSlots = character
    ? getExpectedSpellSlots(character.characterClass as string, character.level, character.gameType)
    : {}

  const expectedHasSlots = Object.values(expectedSlots).some(v => v > 0)
  const slotsNeedSync = expectedHasSlots && Object.keys(expectedSlots).some(
    lvl => maxSlotMap[Number(lvl)] !== expectedSlots[Number(lvl)]
  )

  useEffect(() => {
    if (slotsNeedSync && !updateMaxMutation.isPending) {
      updateMaxMutation.mutate(expectedSlots)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, character?.level, character?.characterClass])

  const handleMaxChange= (level: number, value: number) => {
    updateMaxMutation.mutate({ ...maxSlotMap, [level]: value })
  }

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          <h1 className="text-lg font-bold">Spells Per Day</h1>
        </header>
      )}

      <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-4">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => {
          const max = maxSlotMap[level] ?? 0
          const slotData = slots.find((s) => s.spellLevel === level)
          const used = slotData?.usedSlots ?? 0
          const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0

          return (
            <div key={level} className="bg-gray-900 rounded-xl p-4">
              <div className="relative flex items-center justify-center mb-2">
                <p className="absolute left-0 font-semibold">Level {level}</p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-300 font-medium">{used}</span>
                  <span className="text-gray-600">/</span>
                  <EditableNumber
                    value={max}
                    onChange={v => handleMaxChange(level, v)}
                    min={0}
                    label={`Level ${level} max slots`}
                    className="font-bold text-indigo-300"
                  />
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
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
    </div>
  )
}
