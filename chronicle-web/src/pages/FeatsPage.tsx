import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { featsApi } from '../api/feats'
import { characterFeatsApi } from '../api/characterFeats'
import { charactersApi } from '../api/characters'
import type { Feat, CharacterFeat, FeatModifier } from '../types'

const MODIFIER_LABELS: Record<string, string> = {
  initiative: '⚡ Initiative',
  ac: '🛡 AC',
  hp_per_level: '❤️ HP/Level',
  passive_perception: '👁 Passive Perception',
  passive_investigation: '🔍 Passive Investigation',
  movement: '🏃 Movement',
  medium_armor_max_dex: '🛡 Med. Armor DEX cap',
  damage_reduction: '⚔️ Damage Reduction',
}

function ModifierBadge({ mod }: { mod: FeatModifier }) {
  const label = MODIFIER_LABELS[mod.type] ?? mod.type
  const sign = mod.value >= 0 ? '+' : ''
  const detail = mod.type === 'movement' ? `${sign}${mod.value}ft` : `${sign}${mod.value}`
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
      {label}: {detail}
      {mod.condition && <span className="text-indigo-500 ml-0.5">({mod.condition.replace(/_/g, ' ')})</span>}
    </span>
  )
}

function AsiDisplay({ notes }: { notes?: string | null }) {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed.asiChoices) {
      const text = Object.entries(parsed.asiChoices as Record<string, number>)
        .map(([ability, val]) => `${ability} +${val}`)
        .join(', ')
      return <span className="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full">{text}</span>
    }
  } catch { /* ignore malformed */ }
  return null
}

function FeatCard({
  feat,
  ownedInstances,
  onAdd,
  onRemove,
  adding,
}: {
  feat: Feat
  ownedInstances: CharacterFeat[]
  onAdd: (index: string) => void
  onRemove: (id: string) => void
  adding: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isAsi = feat.index === 'ability-score-improvement'
  const isOwned = ownedInstances.length > 0

  return (
    <div className={`bg-gray-900 rounded-xl overflow-hidden ${isOwned ? 'ring-1 ring-indigo-500/50' : ''}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{feat.name}</span>
            {isOwned && !isAsi && (
              <span className="text-xs bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded-full">✓ Added</span>
            )}
            {isAsi && ownedInstances.length > 0 && (
              <span className="text-xs bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded-full">×{ownedInstances.length} taken</span>
            )}
            {feat.modifiers.map((m, i) => <ModifierBadge key={i} mod={m} />)}
          </div>
          {feat.prerequisites.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Requires: {feat.prerequisites.map(p =>
                p.type === 'ability_score' ? `${p.ability} ${p.minimum_score}+` : p.proficiency ?? p.ability ?? p.type
              ).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwned && !isAsi ? (
            <button
              onClick={e => { e.stopPropagation(); onRemove(ownedInstances[0].id) }}
              className="text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 px-2 py-1 rounded transition-colors"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onAdd(feat.index) }}
              disabled={adding}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-2 py-1 rounded transition-colors"
            >
              + Add
            </button>
          )}
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-2">
          {feat.desc.map((line, i) => (
            <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>
          ))}
          {/* Show owned ASI instances with individual remove buttons */}
          {isAsi && ownedInstances.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Your ASIs</p>
              {ownedInstances.map(cf => (
                <div key={cf.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                  <AsiDisplay notes={cf.notes} />
                  <button
                    onClick={() => onRemove(cf.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeatsPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')

  // ASI feat selection modal state
  const [asiPendingFeat, setAsiPendingFeat] = useState<string | null>(null)
  const [asiMode, setAsiMode] = useState<'two_one' | 'one_two'>('two_one')
  const [asiAbility1, setAsiAbility1] = useState('Strength')
  const [asiAbility2, setAsiAbility2] = useState('Dexterity')

  const { data: character } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: allFeats = [], isLoading: featsLoading } = useQuery({
    queryKey: ['feats', search],
    queryFn: () => featsApi.getAll(search || undefined),
  })

  const { data: charFeats = [] } = useQuery({
    queryKey: ['character-feats', id],
    queryFn: () => characterFeatsApi.getAll(id!),
    enabled: !!id,
  })

  const addMutation = useMutation({
    mutationFn: (req: Parameters<typeof characterFeatsApi.add>[1]) =>
      characterFeatsApi.add(id!, req),
    onSuccess: (newFeat) => {
      qc.setQueryData<CharacterFeat[]>(['character-feats', id], old => [...(old ?? []), newFeat])
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  const handleAdd = (featIndex: string) => {
    if (featIndex === 'ability-score-improvement') {
      setAsiPendingFeat(featIndex)
      setAsiMode('two_one')
      setAsiAbility1('Strength')
      setAsiAbility2('Dexterity')
    } else {
      addMutation.mutate({ featIndex })
    }
  }

  const handleAsiConfirm = () => {
    if (!asiPendingFeat) return
    const asiChoices: Record<string, number> = asiMode === 'two_one'
      ? { [asiAbility1]: 2 }
      : { [asiAbility1]: 1, [asiAbility2]: 1 }
    addMutation.mutate({ featIndex: asiPendingFeat, notes: JSON.stringify({ asiChoices }) })
    setAsiPendingFeat(null)
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return
    addMutation.mutate({ isCustom: true, customName: customName.trim(), customDescription: customDesc.trim() })
    setCustomName('')
    setCustomDesc('')
    setShowCustomModal(false)
  }

  const removeMutation = useMutation({
    mutationFn: (featId: string) => characterFeatsApi.remove(id!, featId),
    onSuccess: (_void, featId) => {
      qc.setQueryData<CharacterFeat[]>(['character-feats', id], old => old?.filter(f => f.id !== featId) ?? [])
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  // Group owned feats by featIndex for the picker (exclude custom feats)
  const ownedByIndex = useMemo(() => {
    const map = new Map<string, CharacterFeat[]>()
    for (const cf of charFeats) {
      if (cf.isCustom) continue
      const key = cf.featIndex ?? ''
      const existing = map.get(key) ?? []
      map.set(key, [...existing, cf])
    }
    return map
  }, [charFeats])

  const customFeats = useMemo(() => charFeats.filter(cf => cf.isCustom), [charFeats])

  // Split feats: class-specific vs general
  const { generalFeats, classFeats } = useMemo(() => {
    const charClass = character?.class ?? ''
    const charSubclass = character?.subclass ?? ''
    const general: Feat[] = []
    const cls: Feat[] = []
    for (const f of allFeats) {
      if (!f.required_class) {
        general.push(f)
      } else if (f.required_class.toLowerCase() === charClass.toLowerCase()) {
        if (!f.required_subclass || f.required_subclass.toLowerCase() === charSubclass.toLowerCase()) {
          cls.push(f)
        }
      }
    }
    return { generalFeats: general, classFeats: cls }
  }, [allFeats, character])

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${id}`)} className="text-gray-400 hover:text-white">←</button>
          <h1 className="text-lg font-bold flex-1">Feats</h1>
          <span className="text-xs text-gray-400">{charFeats.length} known</span>
        </header>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search feats…"
            className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-800 focus:border-indigo-500 focus:outline-none text-sm"
          />

          {featsLoading ? (
            <p className="text-gray-400 text-center py-8">Loading feats…</p>
          ) : (
            <>
              {classFeats.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2 mt-1">
                    {character?.class} Class Abilities
                  </h2>
                  {classFeats.map(feat => (
                    <div key={feat.index} className="mb-2">
                      <FeatCard
                        feat={feat}
                        ownedInstances={ownedByIndex.get(feat.index) ?? []}
                        onAdd={handleAdd}
                        onRemove={(featId) => removeMutation.mutate(featId)}
                        adding={addMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}

              {generalFeats.length > 0 && (
                <div>
                  {classFeats.length > 0 && (
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2 mt-3">General Feats</h2>
                  )}
                  {generalFeats.map(feat => (
                    <div key={feat.index} className="mb-2">
                      <FeatCard
                        feat={feat}
                        ownedInstances={ownedByIndex.get(feat.index) ?? []}
                        onAdd={handleAdd}
                        onRemove={(featId) => removeMutation.mutate(featId)}
                        adding={addMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Custom feats section */}
              {customFeats.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2 mt-3">Custom Feats</h2>
                  {customFeats.map(cf => (
                    <div key={cf.id} className="bg-gray-900 rounded-xl p-4 mb-2 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{cf.name}</span>
                          <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full">Custom</span>
                        </div>
                        {cf.desc?.[0] && <p className="text-xs text-gray-400 mt-1">{cf.desc[0]}</p>}
                      </div>
                      <button
                        onClick={() => removeMutation.mutate(cf.id)}
                        className="text-xs text-red-400 hover:text-red-300 shrink-0 mt-0.5"
                      >Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowCustomModal(true)}
                className="w-full mt-2 py-2 rounded-xl border border-dashed border-purple-700 text-purple-400 hover:bg-purple-900/20 text-sm transition-colors"
              >
                + Add Custom Feat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom Feat Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowCustomModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Add Custom Feat</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Infernal Resilience"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  placeholder="Describe what this feat does…"
                  rows={3}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCustomModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim() || addMutation.isPending}
                className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-2 rounded-lg text-sm font-semibold"
              >Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ASI Feat Selection Modal */}
      {asiPendingFeat && (() => {
        const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setAsiPendingFeat(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-1">Ability Score Improvement</h3>
              <p className="text-sm text-gray-400 mb-4">Choose how to apply your bonus:</p>

              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                  <input type="radio" checked={asiMode === 'two_one'} onChange={() => setAsiMode('two_one')} className="accent-indigo-500" />
                  <span className="text-sm font-medium">+2 to one ability score</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                  <input type="radio" checked={asiMode === 'one_two'} onChange={() => setAsiMode('one_two')} className="accent-indigo-500" />
                  <span className="text-sm font-medium">+1 to two ability scores</span>
                </label>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {asiMode === 'two_one' ? 'Ability (+2)' : 'First ability (+1)'}
                  </label>
                  <select
                    value={asiAbility1}
                    onChange={e => setAsiAbility1(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  >
                    {ABILITY_KEYS.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                {asiMode === 'one_two' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Second ability (+1)</label>
                    <select
                      value={asiAbility2}
                      onChange={e => setAsiAbility2(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                    >
                      {ABILITY_KEYS.filter(k => k !== asiAbility1).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAsiPendingFeat(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm"
                >Cancel</button>
                <button
                  onClick={handleAsiConfirm}
                  disabled={addMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 rounded-lg text-sm font-semibold"
                >Add Feat</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
