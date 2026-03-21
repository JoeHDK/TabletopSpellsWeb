import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { encountersApi } from '../api/encounters'
import { useAuthStore } from '../store/authStore'
import { useEncounterConnection } from '../hooks/useEncounterConnection'
import type { Encounter, EncounterCreature } from '../types'
import AddCreatureModal from '../components/AddCreatureModal'

export default function CombatTrackerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { } = useAuthStore()

  const [showAddCreature, setShowAddCreature] = useState(false)
  const [showAddPlayers, setShowAddPlayers] = useState(false)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [editingHp, setEditingHp] = useState<string | null>(null)
  const [hpDelta, setHpDelta] = useState('')
  const [rollingInitiative, setRollingInitiative] = useState(false)

  useEncounterConnection(id!)

  const { data: game } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  const { data: encounter, isLoading } = useQuery<Encounter | null>({
    queryKey: ['encounter', id],
    queryFn: () => encountersApi.get(id!),
    enabled: !!id,
  })

  const isDM = game?.myRole === 'DM'
  // Use game.characters (already loaded) as the party list — these are characters linked to this room
  const party = game?.characters ?? []

  const startMutation = useMutation({
    mutationFn: () => encountersApi.create(id!),
    onSuccess: (data) => qc.setQueryData(['encounter', id], data),
  })

  const endMutation = useMutation({
    mutationFn: () => encountersApi.delete(id!),
    onSuccess: () => qc.setQueryData(['encounter', id], null),
  })

  const addCreatureMutation = useMutation({
    mutationFn: (data: Parameters<typeof encountersApi.addCreature>[1]) =>
      encountersApi.addCreature(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encounter', id] })
      setShowAddCreature(false)
    },
  })

  const removeCreatureMutation = useMutation({
    mutationFn: (creatureId: string) => encountersApi.removeCreature(id!, creatureId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter', id] }),
  })

  const updateCreatureMutation = useMutation({
    mutationFn: ({ creatureId, data }: { creatureId: string; data: Parameters<typeof encountersApi.updateCreature>[2] }) =>
      encountersApi.updateCreature(id!, creatureId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter', id] }),
  })

  const nextTurnMutation = useMutation({
    mutationFn: () => encountersApi.nextTurn(id!),
    onSuccess: (data) => qc.setQueryData(['encounter', id], data),
  })

  const addPlayersMutation = useMutation({
    mutationFn: (characterIds: string[]) => encountersApi.addPlayers(id!, characterIds),
    onSuccess: (data) => {
      qc.setQueryData(['encounter', id], data)
      setShowAddPlayers(false)
      setSelectedPlayerIds([])
    },
  })

  const rollInitiativeMutation = useMutation({
    mutationFn: () => encountersApi.rollInitiative(id!),
    onSuccess: (data) => {
      qc.setQueryData(['encounter', id], data)
      setRollingInitiative(false)
    },
    onMutate: () => setRollingInitiative(true),
  })

  const applyHpChange = (creature: EncounterCreature) => {
    const delta = Number(hpDelta)
    if (isNaN(delta) || delta === 0) { setEditingHp(null); setHpDelta(''); return }
    const newHp = Math.max(0, Math.min(creature.maxHp, creature.currentHp + delta))
    updateCreatureMutation.mutate({ creatureId: creature.id, data: { currentHp: newHp } })
    setEditingHp(null)
    setHpDelta('')
  }

  const setInitiative = (creature: EncounterCreature, value: string) => {
    const n = Number(value)
    if (!isNaN(n) && value.trim() !== '') {
      updateCreatureMutation.mutate(
        { creatureId: creature.id, data: { initiative: n } },
        { onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter', id] }) }
      )
    }
  }

  const togglePlayer = (characterId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(characterId) ? prev.filter((x) => x !== characterId) : [...prev, characterId]
    )
  }

  if (isLoading || !game) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading…
      </div>
    )
  }

  const creatures = [...(encounter?.creatures ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeIdx = encounter?.activeCreatureIndex ?? 0

  // Characters already in the encounter
  const addedCharacterIds = new Set(
    (encounter?.creatures ?? []).filter((c) => c.characterId).map((c) => c.characterId!)
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/games/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">⚔️ Combat Tracker</h1>
          <p className="text-xs text-gray-400">{game.name}</p>
        </div>
        {encounter && (
          <span className="text-xs text-gray-400">Round {encounter.roundNumber}</span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-4">

        {!encounter ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            {isDM ? (
              <>
                <p className="text-gray-400">No active encounter.</p>
                <button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  ⚔️ Start Encounter
                </button>
              </>
            ) : (
              <p className="text-gray-500">No active encounter. Wait for the DM to start one.</p>
            )}
          </div>
        ) : (
          <>
            {/* DM global controls */}
            {isDM && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddCreature(true)}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Creature
                </button>
                <button
                  onClick={() => setShowAddPlayers((v) => !v)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${showAddPlayers ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
                >
                  👥 Add Players
                </button>
                <button
                  onClick={() => rollInitiativeMutation.mutate()}
                  disabled={rollingInitiative || rollInitiativeMutation.isPending}
                  className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {rollingInitiative ? '🎲 Rolling…' : '🎲 Roll Initiative'}
                </button>
                <button
                  onClick={() => nextTurnMutation.mutate()}
                  disabled={nextTurnMutation.isPending || creatures.length === 0}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  ▶ Next Turn
                </button>
                <button
                  onClick={() => { if (confirm('End the encounter?')) endMutation.mutate() }}
                  className="ml-auto text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg transition-colors"
                >
                  End Encounter
                </button>
              </div>
            )}

            {/* Add Players panel */}
            {isDM && showAddPlayers && (
              <div className="bg-gray-900 border border-indigo-700 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-indigo-300">Select party members to add</h3>
                {party.length === 0 ? (
                  <p className="text-xs text-gray-500">No characters linked to this room. Players need to link their character from the game room page first.</p>
                ) : (
                  <div className="space-y-2">
                    {party.map((member) => {
                      const alreadyIn = addedCharacterIds.has(member.characterId)
                      return (
                        <label
                          key={member.characterId}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${alreadyIn ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                        >
                          <input
                            type="checkbox"
                            disabled={alreadyIn}
                            checked={alreadyIn || selectedPlayerIds.includes(member.characterId)}
                            onChange={() => !alreadyIn && togglePlayer(member.characterId)}
                            className="accent-indigo-500"
                          />
                          <span className="text-sm text-white font-medium">{member.characterName}</span>
                          <span className="text-xs text-gray-400">{member.characterClass} {member.level}</span>
                          <span className="text-xs text-gray-500 ml-auto">{member.ownerUsername}</span>
                          {alreadyIn && <span className="text-xs text-indigo-400">In combat</span>}
                        </label>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => addPlayersMutation.mutate(selectedPlayerIds)}
                    disabled={selectedPlayerIds.length === 0 || addPlayersMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Selected ({selectedPlayerIds.length})
                  </button>
                  <button
                    onClick={() => { setShowAddPlayers(false); setSelectedPlayerIds([]) }}
                    className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Creature list */}
            {creatures.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No creatures yet. {isDM ? 'Add one above.' : ''}</p>
            ) : (
              <div className="space-y-2">
                {creatures.map((c, idx) => {
                  const isActive = idx === activeIdx
                  const hpPct = c.maxHp > 0 ? (c.currentHp / c.maxHp) * 100 : 0
                  const hpColor = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'

                  return (
                    <div
                      key={c.id}
                      className={`bg-gray-900 rounded-xl px-4 py-3 border transition-all ${isActive ? 'border-indigo-500 shadow-lg shadow-indigo-950' : 'border-gray-800'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {isActive && <span className="text-indigo-400 text-xs font-bold shrink-0">▶</span>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white truncate">{c.displayName}</span>
                            {c.isPlayerCharacter && (
                              <span className="text-[10px] font-bold bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded shrink-0">PC</span>
                            )}
                            {c.monsterName && c.monsterName !== c.displayName && (
                              <span className="text-xs text-gray-500 truncate">({c.monsterName})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                          <span>AC {c.armorClass}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Init</span>
                            {isDM ? (
                              <input
                                type="number"
                                defaultValue={c.initiative ?? ''}
                                placeholder="–"
                                onBlur={(e) => setInitiative(c, e.target.value)}
                                className="w-12 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <span className={c.initiative !== null && c.initiative !== undefined ? 'text-white font-medium' : 'text-gray-600'}>
                                {c.initiative ?? '–'}
                              </span>
                            )}
                          </div>
                        </div>
                        {isDM && (
                          <button
                            onClick={() => { if (confirm(`Remove ${c.displayName}?`)) removeCreatureMutation.mutate(c.id) }}
                            className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* HP bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${hpColor}`}
                            style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 min-w-[60px] text-right">
                          {c.currentHp}/{c.maxHp} HP
                        </span>
                        {isDM && (
                          editingHp === c.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                value={hpDelta}
                                onChange={(e) => setHpDelta(e.target.value)}
                                placeholder="±HP"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') applyHpChange(c); if (e.key === 'Escape') { setEditingHp(null); setHpDelta('') } }}
                                className="w-16 bg-gray-800 border border-indigo-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                              />
                              <button onClick={() => applyHpChange(c)} className="text-xs text-green-400 hover:text-green-300">✓</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingHp(c.id); setHpDelta('') }}
                              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors shrink-0"
                            >
                              ±
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showAddCreature && id && (
        <AddCreatureModal
          gameRoomId={id}
          onClose={() => setShowAddCreature(false)}
          onAdd={(data) => addCreatureMutation.mutate(data)}
        />
      )}
    </div>
  )
}
