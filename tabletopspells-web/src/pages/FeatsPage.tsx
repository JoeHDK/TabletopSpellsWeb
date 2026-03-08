import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { featsApi } from '../api/feats'
import { characterFeatsApi } from '../api/characterFeats'
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

function FeatCard({
  feat,
  isOwned,
  onAdd,
  onRemove,
  ownedId,
  adding,
}: {
  feat: Feat
  isOwned: boolean
  ownedId?: string
  onAdd: (index: string) => void
  onRemove: (id: string) => void
  adding: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`bg-gray-900 rounded-xl overflow-hidden ${isOwned ? 'ring-1 ring-indigo-500/50' : ''}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{feat.name}</span>
            {isOwned && (
              <span className="text-xs bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded-full">✓ Known</span>
            )}
            {feat.modifiers.map((m, i) => <ModifierBadge key={i} mod={m} />)}
          </div>
          {feat.prerequisites.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              Requires: {feat.prerequisites.map(p =>
                p.type === 'ability_score' ? `${p.ability} ${p.minimum_score}+` : p.proficiency ?? p.ability ?? p.type
              ).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwned ? (
            <button
              onClick={e => { e.stopPropagation(); ownedId && onRemove(ownedId) }}
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
        </div>
      )}
    </div>
  )
}

export default function FeatsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'my' | 'browse'>('my')
  const [search, setSearch] = useState('')

  const { data: allFeats = [], isLoading: featsLoading } = useQuery({
    queryKey: ['feats', search],
    queryFn: () => featsApi.getAll(search || undefined),
    enabled: tab === 'browse',
  })

  const { data: charFeats = [], isLoading: charFeatsLoading } = useQuery({
    queryKey: ['character-feats', id],
    queryFn: () => characterFeatsApi.getAll(id!),
    enabled: !!id,
  })

  const addMutation = useMutation({
    mutationFn: (featIndex: string) => characterFeatsApi.add(id!, { featIndex }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character-feats', id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (featId: string) => characterFeatsApi.remove(id!, featId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character-feats', id] }),
  })

  const ownedIndexMap = useMemo(
    () => new Map(charFeats.map(cf => [cf.featIndex, cf.id])),
    [charFeats]
  )

  const filteredMine = useMemo(() => {
    if (!search.trim()) return charFeats
    return charFeats.filter(cf => cf.name.toLowerCase().includes(search.toLowerCase()))
  }, [charFeats, search])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1">Feats</h1>
        <span className="text-xs text-gray-500">{charFeats.length} known</span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {([
          { id: 'my', label: '✨ My Feats' },
          { id: 'browse', label: '🔍 Browse' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search feats…"
            className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-800 focus:border-indigo-500 focus:outline-none text-sm"
          />

          {/* My Feats tab */}
          {tab === 'my' && (
            <>
              {charFeatsLoading ? (
                <p className="text-gray-400 text-center py-8">Loading…</p>
              ) : filteredMine.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-4xl mb-3">🎯</p>
                  <p>{charFeats.length === 0 ? 'No feats yet.' : 'No matching feats.'}</p>
                  <button
                    onClick={() => setTab('browse')}
                    className="mt-2 text-indigo-400 text-sm hover:underline"
                  >
                    Browse feats to add some
                  </button>
                </div>
              ) : (
                filteredMine.map(cf => (
                  <CharacterFeatCard
                    key={cf.id}
                    charFeat={cf}
                    onRemove={(featId) => removeMutation.mutate(featId)}
                  />
                ))
              )}
            </>
          )}

          {/* Browse tab */}
          {tab === 'browse' && (
            <>
              {featsLoading ? (
                <p className="text-gray-400 text-center py-8">Loading feats…</p>
              ) : (
                allFeats.map(feat => (
                  <FeatCard
                    key={feat.index}
                    feat={feat}
                    isOwned={ownedIndexMap.has(feat.index)}
                    ownedId={ownedIndexMap.get(feat.index)}
                    onAdd={(idx) => addMutation.mutate(idx)}
                    onRemove={(featId) => removeMutation.mutate(featId)}
                    adding={addMutation.isPending}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CharacterFeatCard({ charFeat, onRemove }: { charFeat: CharacterFeat; onRemove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden ring-1 ring-indigo-500/30">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{charFeat.name}</span>
            {charFeat.modifiers.map((m, i) => <ModifierBadge key={i} mod={m} />)}
          </div>
          {charFeat.takenAtLevel && (
            <p className="text-xs text-gray-500 mt-0.5">Taken at level {charFeat.takenAtLevel}</p>
          )}
          {charFeat.notes && (
            <p className="text-xs text-gray-400 mt-0.5 italic">{charFeat.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onRemove(charFeat.id) }}
            className="text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 px-2 py-1 rounded transition-colors"
          >
            Remove
          </button>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-2">
          {charFeat.desc.map((line, i) => (
            <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
