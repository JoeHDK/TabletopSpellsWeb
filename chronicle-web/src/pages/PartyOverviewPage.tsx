import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { charactersApi } from '../api/characters'
import type { PartyMember } from '../types'

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const colour = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`h-full ${colour} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function PartyOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [hpError, setHpError] = useState('')

  const { data: party = [], isLoading } = useQuery<PartyMember[]>({
    queryKey: ['party', id],
    queryFn: () => gamesApi.getParty(id!),
    enabled: !!id,
    refetchInterval: 10000,
  })

  const hpMutation = useMutation({
    mutationFn: ({ charId, hp }: { charId: string; hp: number }) =>
      charactersApi.updateHp(charId, hp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party', id] })
      setHpError('')
    },
    onError: () => setHpError('Failed to update HP.'),
  })

  const adjustHp = useCallback((member: PartyMember, delta: number) => {
    const newHp = Math.max(0, Math.min(member.maxHp, member.currentHp + delta))
    hpMutation.mutate({ charId: member.characterId, hp: newHp })
  }, [hpMutation])

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/games/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1">Party Overview</h1>
        <span className="text-xs text-gray-500">Auto-refreshes every 10s</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-4xl mx-auto w-full">
        {hpError && <p className="text-red-400 text-sm mb-3">{hpError}</p>}

        {party.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No characters linked to this game yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {party.map(m => (
              <div key={m.characterId} className="bg-gray-900 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{m.characterName}</h2>
                    <p className="text-sm text-gray-400">{m.characterClass} · Lv {m.level}</p>
                  </div>
                  <span className="text-xs text-gray-500">@{m.ownerUsername}</span>
                </div>

                {/* HP */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6">HP</span>
                    <button
                      onClick={() => adjustHp(m, -1)}
                      className="w-7 h-7 bg-gray-800 hover:bg-red-900/50 rounded-full text-sm transition-colors"
                      title="Damage"
                    >−</button>
                    <span className="min-w-[60px] text-center font-semibold text-sm">
                      {m.currentHp} / {m.maxHp}
                    </span>
                    <button
                      onClick={() => adjustHp(m, 1)}
                      className="w-7 h-7 bg-gray-800 hover:bg-green-900/50 rounded-full text-sm transition-colors"
                      title="Heal"
                    >+</button>
                    <HpBar current={m.currentHp} max={m.maxHp} />
                  </div>
                </div>

                {/* AC + Passive Perception */}
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">AC</span>
                    <span className="font-semibold">
                      {m.equipmentAcBonus > 0
                        ? <>{m.baseArmorClass} <span className="text-indigo-400">+ {m.equipmentAcBonus}</span></>
                        : m.baseArmorClass}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Passive Perc.</span>
                    <span className="font-semibold">{m.passivePerception}</span>
                  </div>
                </div>

                {/* Spell slots */}
                {Object.keys(m.spellSlotsRemaining).length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Spell Slots</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(m.spellSlotsRemaining)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([lvl, rem]) => (
                          <span
                            key={lvl}
                            className="bg-indigo-900/40 border border-indigo-700/60 rounded-md px-2 py-0.5 text-xs"
                            title={`Level ${lvl}`}
                          >
                            Lv{lvl}: {rem}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
